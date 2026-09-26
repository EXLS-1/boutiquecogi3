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

import { Prisma, ProductStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidUuid } from "@/lib/utils";
import { Role } from "@prisma/client";
import type { DynamicProductInput } from "./validationService";
import { ProductValidationService } from "./validationService";
import {
  transitionProductStatus,
  ProductWorkflowError,
} from "./product-workflow";
import { resolveProductPrice } from "@/lib/product-pricing/pricing.service";
import {
  adjustVariantStock,
} from "@/lib/product-inventory/inventory.service";
import {
  recordProductAudit,
  PRODUCT_AUDIT_ACTIONS,
} from "@/lib/product-audit";
import { checkVariantLimit } from "@/lib/product-type";
import {
  normalizeCategoryIds,
  syncProductCategories,
  validateCategoriesExist,
} from "@/server/services/product-category-sync";

import {
  findProductById,
  findVariantById,
  findPriceById,
} from "./product-lookups";

/** Acteur de mutation (contrôle d'accès déjà vérifié côté Server Action). */
export interface ProductActor {
  userId: string;
  role?: Role | string;
  reason?: string;
}

/** Résultat de création (objet stable — pas d'ID nu). */
export interface CreateProductResult {
  productId: string;
  slug: string;
  variantCount: number;
  totalStock: number;
}

/** Payload accepté par la façade create (schéma strict + acteur/audit optionnels). */
export type CreateProductFacadeInput = DynamicProductInput & {
  actor?: ProductActor;
  context?: unknown;
  auditContext?: unknown;
};

/** Payload accepté par la façade update (partiel + acteur/audit optionnels). */
export type UpdateProductFacadeInput = Partial<DynamicProductInput> & {
  actor?: ProductActor;
  context?: unknown;
  auditContext?: unknown;
};

export class ProductServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
    options?: ErrorOptions,
    /**
     * Charge utile structurée (erreurs de champs, identifiants…) remontée telle
     * quelle par les Server Actions via `actionError(code, message, details)`.
     */
    public details?: Record<string, unknown>,
  ) {
    super(message, options);
    this.name = "ProductServiceError";
  }
}

type Tx = Prisma.TransactionClient;
// Les résolveurs ne dépendent que des lectures produit/variante, en transaction ou non.
type ProductLookupClient = Pick<PrismaClient, "product" | "productVariant">;

const TRANSACTION_OPTIONS = { isolationLevel: "Serializable" as const, maxWait: 5000, timeout: 15000 };
const MAX_RETRIES = 2;

export class ProductService {
  // ═══════════════════════════════════════════════════════════════════════════
  // CRÉATION COMPLÈTE (wizard 7 étapes → 1 transaction)
  // ═══════════════════════════════════════════════════════════════════════════

  static async create(input: DynamicProductInput, userId: string): Promise<string> {
    return this._executeInTransaction(async (tx) => {
      const validated = ProductValidationService.parse(input);
      // Type produit : résolu en transaction, type réellement actif en base
      // (jamais d'identifiant fictif) — erreur explicite avec le type manquant.
      const typeConfig = validated.productTypeId
        ? await tx.productTypeConfig.findUnique({ where: { id: validated.productTypeId, isActive: true } })
        : await tx.productTypeConfig.findFirst({ where: { isDefault: true, isActive: true }, orderBy: { id: "asc" } });
      if (!typeConfig) {
        throw new ProductServiceError(
          validated.productTypeId
            ? `Type de produit actif introuvable : ${validated.productTypeId}`
            : "Aucun ProductTypeConfig actif par défaut (type PHYSICAL attendu)",
          "VALIDATION_ERROR",
        );
      }
      const variants = ProductValidationService.normalizeVariants(validated);
      await checkVariantLimit({ allowed: true, reasons: [], config: typeConfig }, variants.length);

      const categoryIds = normalizeCategoryIds(validated.categoryId, validated.categoryIds);
      await validateCategoriesExist(tx, categoryIds);

      const slug = await this._resolveUniqueSlug(tx, validated.name, validated.slug);
      const sku = validated.sku ?? (await this._resolveUniqueSku(tx, validated.name));
      const totalStock = ProductValidationService.computeTotalStock(variants);

      const product = await tx.product.create({
        data: {
          name: validated.name,
          slug,
          sku,
          description: validated.description ?? "",
          productTypeId: typeConfig.id,
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
          productImages: { create: (validated.images ?? []).map((url, i) => ({ url, alt: validated.name, position: i })) },
          productOptions: { create: Object.entries(validated.attributes ?? {}).map(([k, v]) => ({ name: k, value: String(v) })) },
          categoryProducts: categoryIds.length > 0 ? {
            create: categoryIds.map((id, idx) => ({ categoryId: id, displayOrder: idx })),
          } : undefined,
        },
        include: { stock: true },
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

      if (typeConfig.requiresApproval) {
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

      const categoryProvided = input.categoryId !== undefined || input.categoryIds !== undefined;
      const categoryIds = normalizeCategoryIds(input.categoryId, input.categoryIds);
      if (categoryProvided) await validateCategoriesExist(tx, categoryIds);

      const updateData = {
        ...(input.name && { name: input.name }),
        // undefined conserve la description ; null la vide (colonne non nullable).
        ...(input.description !== undefined && { description: input.description ?? "" }),
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
      } satisfies Prisma.ProductUncheckedUpdateInput;
      await tx.product.update({ where: { id: productId }, data: updateData });

      if (categoryProvided) {
        await syncProductCategories(tx, productId, categoryIds);
      }

      // undefined conserve les tags ; null ou [] supprime toutes les associations.
      if (input.tagIds !== undefined) {
        const tagIds = [...new Set(input.tagIds ?? [])];
        await tx.productTag.deleteMany({ where: { productId } });
        if (tagIds.length > 0) await tx.productTag.createMany({ data: tagIds.map((tagId) => ({ productId, tagId })) });
      }

      await recordProductAudit({
        action: PRODUCT_AUDIT_ACTIONS.UPDATED,
        userId,
        productId,
        oldValue: existing,
        newValue: {
          ...updateData,
          saleStart: input.saleStart === null ? null : input.saleStart?.toISOString(),
          saleEnd: input.saleEnd === null ? null : input.saleEnd?.toISOString(),
        },
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

  private static async _transitionStatus(...args: Parameters<typeof transitionProductStatus>): Promise<void> {
    try {
      await transitionProductStatus(...args);
    } catch (error) {
      if (error instanceof ProductWorkflowError) {
        throw new ProductServiceError(error.message, error.code, error.statusCode, { cause: error });
      }
      throw error;
    }
  }

  static async publish(productId: string, userId: string): Promise<void> {
    await this._transitionStatus(productId, ProductStatus.PUBLISHED, { actedBy: userId, reason: "Publication manuelle" });
    await recordProductAudit({ action: PRODUCT_AUDIT_ACTIONS.PUBLISHED, userId, productId, newValue: { status: ProductStatus.PUBLISHED } });
  }

  static async submitForReview(productId: string, userId: string): Promise<void> {
    await this._transitionStatus(productId, ProductStatus.PENDING, { actedBy: userId, reason: "Soumis en révision", notify: true });
  }

  static async schedule(productId: string, scheduledAt: Date, userId: string): Promise<void> {
    await this._transitionStatus(productId, ProductStatus.SCHEDULED, { actedBy: userId, reason: "Publication programmée", scheduledAt });
  }

  static async archive(productId: string, userId: string): Promise<void> {
    await this._transitionStatus(productId, ProductStatus.ARCHIVED, { actedBy: userId, reason: "Archivage manuel" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STOCK (délégué à InventoryService)
  // ═══════════════════════════════════════════════════════════════════════════

  static async adjustStock(input: { variantId: string; delta: number; reason: Parameters<typeof adjustVariantStock>[0]["reason"]; userId: string }): Promise<void> {
    await adjustVariantStock(input);
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

  private static async _resolveUniqueSlug(tx: ProductLookupClient, name: string, provided?: string | null): Promise<string> {
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

  private static _skuName(name: string): string {
    // Préfixe lisible, borné et ASCII ; repli pour les noms sans caractères latins.
    return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 16) || "PRODUCT";
  }

  private static async _resolveUniqueSku(tx: ProductLookupClient, name: string): Promise<string> {
    const prefix = this._skuName(name);
    for (let i = 0; i < 10; i++) {
      const sku = `SKU-${prefix}-${Date.now()}-${i}`;
      const exists = await tx.product.findUnique({ where: { sku }, select: { id: true } });
      if (!exists) return sku;
    }
    throw new ProductServiceError("SKU produit unique impossible", "SKU_CONFLICT");
  }

  private static async _resolveUniqueVariantSku(tx: ProductLookupClient, name: string, index: number): Promise<string> {
    const prefix = this._skuName(name);
    for (let i = 0; i < 10; i++) {
      const sku = `VAR-${prefix}-${Date.now()}-${index}-${i}`;
      const exists = await tx.productVariant.findUnique({ where: { sku }, select: { id: true } });
      if (!exists) return sku;
    }
    throw new ProductServiceError("SKU variante unique impossible", "SKU_CONFLICT");
  }

  static async getDetails(productId: string) {
    // Un identifiant non-UUID ferait échouer la requête PostgreSQL
    // (« invalid input syntax for type uuid ») : on renvoie null → notFound() côté page.
    if (!isValidUuid(productId)) return null;
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

  // ══════════════════════════════════════════════════════════════════════════
  // LECTURES PARTAGÉES (consommées par les Server Actions produit)
  // ═══════════════════════════════════════════════════════════════════════════
  // Délèguent à `product-lookups.ts` : les includes sont définis une seule fois
  // et restent identiques à ceux de `product-service-helpers.ts`.

  /** Produit complet (variantes, stocks, prix, images, catégories, tags, catalogues). */
  static getProductById(productId: string) {
    return findProductById(productId);
  }

  /**
   * Variante + stocks + produit parent : le `productId` est donc disponible
   * pour la revalidation de chemin côté action.
   */
  static getVariantById(variantId: string) {
    return findVariantById(variantId);
  }

  /** Prix produit + produit porteur (contrôle d'appartenance avant mutation). */
  static getPriceById(priceId: string) {
    return findPriceById(priceId);
  }
}



