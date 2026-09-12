// lib/products/product.service.ts
// =============================================================================
// PRODUCT SERVICE — Orchestration métier complète
// =============================================================================
// UNIQUE point d'entrée pour toute mutation produit : CRUD, publication, stock.
// Orchestre : RBAC → Validation → TypeConfig → Transaction → AuditLog → Historique.
//
// Délègue l'implémentation détaillée aux services spécialisés existants :
//   - ProductValidationService  (validationService.ts)
//   - ProductWorkflow           (product-workflow.ts)
//   - resolveProductPrice       (product-pricing/pricing.service.ts)
//   - adjustVariantStock        (product-inventory/inventory.service.ts)
//   - recordProductAudit        (product-audit/product-audit.service.ts)
//   - ProductTypeConfig policy  (product-type/product-type.repository.ts)
//

import { Prisma, ProductStatus, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DynamicProductInput } from "./types";
import { ProductValidationService } from "./validationService";
import {
  transitionProductStatus,
  ProductWorkflowError,
} from "./product-workflow";
import { resolveProductPrice } from "@/lib/product-pricing/pricing.service";
import { adjustVariantStock } from "@/lib/product-inventory/inventory.service";
import { recordProductAudit, PRODUCT_AUDIT_ACTIONS } from "@/lib/product-audit";
import {
  getProductTypeConfig,
  checkVariantLimit,
} from "@/lib/product-type";
import { normalizeCategoryIds, validateCategoriesExist } from "@/server/services/product-category-sync";

export class ProductServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ProductServiceError";
  }
}

type Tx = Prisma.TransactionClient;

const TRANSACTION_OPTIONS = { isolationLevel: "Serializable" as const, maxWait: 5000, timeout: 15000 };
const MAX_RETRIES = 2;

export class ProductService {
  // ═══════════════════════════════════════════════════════════════════════════
  // CRÉATION COMPLÈTE (wizard 7 étapes → 1 transaction)
  // ═══════════════════════════════════════════════════════════════════════════

  static async create(input: DynamicProductInput, userId: string): Promise<string> {
    return this._executeInTransaction(async (tx) => {
      const validated = ProductValidationService.parse(input);
      const config = await getProductTypeConfig(validated.productTypeId ?? null);
      const variants = ProductValidationService.normalizeVariants(validated);
      await checkVariantLimit({ allowed: true, reasons: [], config }, variants.length);

      const categoryIds = normalizeCategoryIds(undefined, validated.categoryIds);
      if (categoryIds.length > 0) await validateCategoriesExist(prisma as any, categoryIds);

      const slug = await this._resolveUniqueSlug(tx, validated.name, validated.slug);
      const sku = validated.sku ?? (await this._resolveUniqueSku(tx, validated.name));
      const totalStock = ProductValidationService.computeTotalStock(variants);

      const product = await tx.product.create({
        data: {
          name: validated.name,
          slug,
          sku,
          description: validated.description ?? "",
          productTypeId: config.id,
          currency: validated.currency ?? "USD",
          categoryId: categoryIds[0] ?? null,
          userId,
          createdBy: userId,
          status: ProductStatus.DRAFT,
          isActive: false,
          isFeatured: validated.isFeatured ?? false,
          ...(validated.seoTitle && { seoTitle: validated.seoTitle }),
          ...(validated.seoDescription && { seoDescription: validated.seoDescription }),
          ...(validated.salePrice && { salePrice: validated.salePrice }),
          ...(validated.saleStart && { saleStart: validated.saleStart }),
          ...(validated.saleEnd && { saleEnd: validated.saleEnd }),
          productPrices: validated.prices ? {
            create: validated.prices.map((p) => ({
              currency: p.currency,
              amount: p.amount,
              compareAtPrice: p.compareAtPrice ?? null,
              country: p.country ?? null,
              region: p.region ?? null,
              startsAt: p.startsAt ?? null,
              endsAt: p.endsAt ?? null,
            })),
          } : undefined,
          stock: { create: { quantity: totalStock, reserved: 0, updatedBy: userId } },
          productImages: (validated.images ?? []).map((url, i) => ({ url, alt: validated.name, position: i })),
          productOptions: Object.entries(validated.attributes ?? {}).map(([k, v]) => ({ name: k, value: String(v) })),
          categoryProducts: categoryIds.length > 0 ? {
            create: categoryIds.map((id, idx) => ({ categoryId: id, displayOrder: idx })),
          } : undefined,
        },
      });

      // Variantes + VariantStock
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku ?? (await this._resolveUniqueVariantSku(tx, validated.name, i)),
            attributes: v.attributes as Prisma.InputJsonValue,
            priceOffset: v.priceOffset ?? 0,
          },
        });
        await tx.variantStock.create({
          data: { variantId: variant.id, quantity: v.initialStock, reserved: 0, updatedBy: userId },
        });
        if (v.initialStock > 0) {
          await tx.stockMovement.create({ data: { stockId: product.stock!.id, type: "IN", quantity: v.initialStock, delta: v.initialStock, reason: "INITIAL", userId } });
          await tx.inventoryTransaction.create({ data: { productId: product.id, variantId: variant.id, quantity: v.initialStock, reason: "RESTOCK", performedBy: userId } });
        }
      }

      await tx.product_Availability_Projection.upsert({
        where: { productId: product.id },
        create: { productId: product.id, isAvailable: totalStock > 0 },
        update: { isAvailable: totalStock > 0 },
      });
      await tx.productStatusHistory.create({
        data: { productId: product.id, oldStatus: ProductStatus.DRAFT, newStatus: ProductStatus.DRAFT, reason: "Produit créé (brouillon)", changedById: userId },
      });
      await recordProductAudit({ action: PRODUCT_AUDIT_ACTIONS.CREATED, userId, productId: product.id, newValue: { name: validated.name, variantCount: variants.length, totalStock }, details: `Produit créé : ${variants.length} variante(s), ${totalStock} unité(s)` }, tx);

      if (config.requiresApproval) {
        await tx.product.update({ where: { id: product.id }, data: { status: ProductStatus.PENDING } });
        await tx.productStatusHistory.create({ data: { productId: product.id, oldStatus: ProductStatus.DRAFT, newStatus: ProductStatus.PENDING, reason: "Approbation requise", changedById: userId } });
        await recordProductAudit({ action: PRODUCT_AUDIT_ACTIONS.APPROVAL_REQUESTED, userId, productId: product.id }, tx);
      }
      return product.id;
        }, MAX_RETRIES);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MISE À JOUR
  // ═══════════════════════════════════════════════════════════════════════════

  static async update(productId: string, input: Partial<DynamicProductInput>, userId: string): Promise<void> {
    await this._executeInTransaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, productTypeId: true, basePrice: true, price: true, status: true },
      });
      if (!existing) throw new ProductServiceError("Produit introuvable", "NOT_FOUND");

      const categoryIds = normalizeCategoryIds(undefined, input.categoryIds);
      if (categoryIds.length > 0) await validateCategoriesExist(prisma as any, categoryIds);

      const updateData: any = {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.sku && { sku: input.sku }),
        ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
        ...(input.salePrice !== undefined && { salePrice: input.salePrice }),
        ...(input.saleStart !== undefined && { saleStart: input.saleStart }),
        ...(input.saleEnd !== undefined && { saleEnd: input.saleEnd }),
        ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
        ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
        ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl }),
        updatedBy: userId,
      };
      await tx.product.update({ where: { id: productId }, data: updateData });

      if (categoryIds.length > 0) {
        await tx.categoryProduct.deleteMany({ where: { productId } });
        await tx.categoryProduct.createMany({ data: categoryIds.map((id, idx) => ({ productId, categoryId: id, displayOrder: idx })) });
        await tx.product.update({ where: { id: productId }, data: { categoryId: categoryIds[0] ?? null } });
      }

      if (input.tagIds !== undefined) {
        await tx.productTag.deleteMany({ where: { productId } });
        if (input.tagIds.length > 0) await tx.productTag.createMany({ data: input.tagIds.map((tagId) => ({ productId, tagId })) });
      }

      await recordProductAudit({
        action: PRODUCT_AUDIT_ACTIONS.UPDATED,
        userId,
        productId,
        oldValue: existing,
        newValue: updateData,
        details: "Produit mis à jour",
      }, tx);
    }, MAX_RETRIES);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPRESSION (soft-delete)
  // ═══════════════════════════════════════════════════════════════════════════

  static async softDelete(productId: string, userId: string): Promise<void> {
    await this._executeInTransaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId }, select: { status: true, isdeleted: true } });
      if (!product) throw new ProductServiceError("Produit introuvable", "NOT_FOUND");
      if (product.isdeleted) throw new ProductServiceError("Produit déjà supprimé", "ALREADY_DELETED");

      await tx.product.update({
        where: { id: productId },
        data: { isdeleted: true, deletedAt: new Date(), status: ProductStatus.ARCHIVED },
      });
      await tx.productStatusHistory.create({
        data: { productId, oldStatus: product.status, newStatus: ProductStatus.ARCHIVED, reason: "Suppression douce", changedById: userId },
      });
      await recordProductAudit({ action: PRODUCT_AUDIT_ACTIONS.DELETED, userId, productId }, tx);
    }, MAX_RETRIES);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLICATION (workflow via ProductWorkflow)
  // ═══════════════════════════════════════════════════════════════════════════

  static async publish(productId: string, userId: string): Promise<void> {
    await transitionProductStatus(productId, ProductStatus.PUBLISHED, { actedBy: userId, reason: "Publication manuelle" });
    await recordProductAudit({ action: PRODUCT_AUDIT_ACTIONS.PUBLISHED, userId, productId, newValue: { status: ProductStatus.PUBLISHED } });
  }

  static async submitForReview(productId: string, userId: string): Promise<void> {
    await transitionProductStatus(productId, ProductStatus.PENDING, { actedBy: userId, reason: "Soumis en révision", notify: true });
  }

  static async schedule(productId: string, scheduledAt: Date, userId: string): Promise<void> {
    await transitionProductStatus(productId, ProductStatus.SCHEDULED, { actedBy: userId, reason: "Publication programmée", scheduledAt });
  }

  static async archive(productId: string, userId: string): Promise<void> {
    await transitionProductStatus(productId, ProductStatus.ARCHIVED, { actedBy: userId, reason: "Archivage manuel" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STOCK (délégué à InventoryService)
  // ═══════════════════════════════════════════════════════════════════════════

  static async adjustStock(input: { variantId: string; delta: number; reason: string; userId: string }): Promise<void> {
    await adjustVariantStock({ variantId: input.variantId, delta: input.delta, reason: input.reason as any, userId: input.userId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIX (délégué à PricingService)
  // ═══════════════════════════════════════════════════════════════════════════

    static async resolvePrice(productId: string, context?: Parameters<typeof resolveProductPrice>[1]) {
    return resolveProductPrice(productId, context);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS (privés)
  // ═══════════════════════════════════════════════════════════════════════════

  private static async _executeInTransaction<T>(fn: (tx: Tx) => Promise<T>, retries: number): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await prisma.$transaction(fn, TRANSACTION_OPTIONS);
      } catch (error) {
        const isRetryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (isRetryable && attempt < retries) continue;
        throw error;
      }
    }
    throw new Error("TRANSACTION_UNREACHABLE");
  }

  private static async _resolveUniqueSlug(tx: Tx, name: string, provided?: string | null): Promise<string> {
    if (provided) {
      const exists = await tx.product.findUnique({ where: { slug: provided }, select: { id: true } });
      if (!exists) return provided;
    }
    for (let i = 0; i < 10; i++) {
      const slug = i === 0 ? name : `${name}-${i}`;
      const exists = await tx.product.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) return slug;
    }
    throw new ProductServiceError("Slug unique impossible", "SLUG_CONFLICT");
  }

  private static async _resolveUniqueSku(tx: Tx, name: string): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const sku = `SKU-${Date.now()}-${i}`;
      const exists = await tx.product.findUnique({ where: { sku }, select: { id: true } });
      if (!exists) return sku;
    }
    throw new ProductServiceError("SKU produit unique impossible", "SKU_CONFLICT");
  }

  private static async _resolveUniqueVariantSku(tx: Tx, name: string, index: number): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const sku = `VAR-${Date.now()}-${index}-${i}`;
      const exists = await tx.productVariant.findUnique({ where: { sku }, select: { id: true } });
      if (!exists) return sku;
    }
    throw new ProductServiceError("SKU variante unique impossible", "SKU_CONFLICT");
  }

  static async getDetails(productId: string): Promise<any | null> {
    return prisma.product.findUnique({
      where: { id: productId, isdeleted: false },
      include: {
        productType: { select: { type: true, label: true, maxVariants: true, requiresApproval: true } },
        variants: { include: { variantStocks: true } },
        productPrices: true,
        productImages: { orderBy: { position: "asc" } },
        statusHistory: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { id: true, name: true } } } },
        category: { select: { id: true, name: true, slug: true } },
        categoryProducts: { include: { category: true } },
        catalogs: { include: { catalog: { select: { id: true, name: true } } } },
        productTags: { include: { tag: true } },
        productAttributeValues: { include: { attribute: true } },
        productOptions: true,
        productReviews: { orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { id: true, name: true } } } },
        availabilityProjection: { select: { isAvailable: true } },
        stock: { select: { quantity: true, reserved: true } },
      },
    });
  }
}



