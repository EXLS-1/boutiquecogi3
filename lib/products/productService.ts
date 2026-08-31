// lib/products/productService.ts
// =============================================================================
// SERVICE — Ajout dynamique de produits au stock (atomique & anti-fragile)
// =============================================================================
// Garanties :
//  1. TOUTE création génère obligatoirement : 1 Product + ≥ 1 ProductVariant
//     + 1 Stock + des mouvements d'audit (StockMovement / InventoryTransaction).
//     → Aucun produit « statique » sans inventaire n'est possible.
//  2. Atomicité : transaction Serializable + retry sur P2034 (deadlock/serialisation).
//  3. Anti-overselling : décrément via `updateMany` avec garde `quantity >= X`
//     (verrouillage ligne PostgreSQL, aucun check applicatif obsolète).
//  4. Slug & SKU uniques garantis (collision → suffixe, jamais d'écriture ratée).

import { z } from "zod";
import {
  Prisma,
  ProductStatus,
  StockMovementType,
  TransactionType,
  Currency,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSKU } from "@/lib/utils/sku";
import { slugify } from "@/lib/utils/slug";
import { ProductValidationService } from "./validationService";
import type { StockMovementInput } from "./types";

// ─── Erreur métier typée ─────────────────────────────────────────────────────

export const PRODUCT_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  SLUG_CONFLICT: "SLUG_CONFLICT",
  SKU_CONFLICT: "SKU_CONFLICT",
  SLUG_GENERATION_FAILED: "SLUG_GENERATION_FAILED",
  SKU_GENERATION_FAILED: "SKU_GENERATION_FAILED",
  VARIANT_NOT_FOUND: "VARIANT_NOT_FOUND",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ProductErrorCode = keyof typeof PRODUCT_ERROR_CODES;

export class ProductError extends Error {
  constructor(
    message: string,
    public readonly code: ProductErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ProductError";
  }
}

// ─── Constantes de robustesse ────────────────────────────────────────────────

const MAX_TRANSACTION_RETRIES = 2;
const TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable" as const,
  maxWait: 5000,
  timeout: 15000,
};

type Tx = Prisma.TransactionClient;

export class ProductService {
  // ═══════════════════════════════════════════════════════════════════════════
  // CRÉATION DYNAMIQUE (minimaliste → matrice complète)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Ajoute dynamiquement un produit + son inventaire en une transaction atomique.
   *
   * @param rawInput Payload dynamique validée par Zod (voir validationService.ts).
   * @param userId   Auteur de l'opération (audit + createdBy).
   * @throws ProductError sur tout échec (aucun produit orphelin possible).
   */
  static async createDynamicProduct(
    rawInput: unknown,
    userId: string
  ): Promise<{ productId: string; variantCount: number; totalStock: number; slug: string }> {
    // 1. Validation runtime stricte
    let input;
    try {
      input = ProductValidationService.parse(rawInput);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ProductError(
          "Validation des données du produit échouée.",
          PRODUCT_ERROR_CODES.VALIDATION_ERROR,
          error.flatten()
        );
      }
      throw error;
    }

    // 2. Exécution transactionnelle avec retry anti-concurrence
    for (let attempt = 0; ; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const slug = await ProductService.resolveUniqueSlug(tx, input.name);
          const variants = ProductValidationService.normalizeVariants(input);
          const totalStock = ProductValidationService.computeTotalStock(variants);
          const productSku = await ProductService.resolveUniqueProductSku(tx, input.name);

          // 2a-bis. Résolution des catégories : union categoryId + categoryIds,
          // dédupliquée, validée en base (existence réelle).
          const categoryIds = [
            ...new Set(
              [input.categoryId, ...(input.categoryIds ?? [])].filter(
                (id): id is string => typeof id === "string" && id.trim() !== "",
              ),
            ),
          ];
          if (categoryIds.length > 0) {
            const found = await tx.category.findMany({
              where: { id: { in: categoryIds } },
              select: { id: true },
            });
            if (found.length !== categoryIds.length) {
              throw new ProductError(
                "Une ou plusieurs catégories sont introuvables.",
                PRODUCT_ERROR_CODES.CATEGORY_NOT_FOUND,
                {
                  missing: categoryIds.filter(
                    (id) => !found.some((c) => c.id === id),
                  ),
                },
              );
            }
          }

          // 2a. Produit parent (publication immédiate = visible en catalogue)
          const product = await tx.product.create({
            data: {
              name: input.name,
              slug,
              sku: productSku,
              description: input.description ?? "",
              price: input.basePrice,
              basePrice: input.basePrice,
              currency: input.currency ?? Currency.USD,
              categoryId: categoryIds[0] ?? null,
              userId,
              images: input.images ?? [],
              status: ProductStatus.PUBLISHED,
              isActive: true,
              publishedAt: new Date(),
              createdBy: userId,
              publishedById: userId,
              // Variante(s) + stock + audit sont créés ci-dessous.
              productImages: {
                create: (input.images ?? []).map((url, i) => ({
                  url,
                  alt: input.name,
                  position: i,
                })),
              },
              productOptions: {
                create: Object.entries(input.attributes ?? {}).map(([name, value]) => ({
                  name,
                  value: String(value),
                })),
              },
              stock: {
                create: {
                  quantity: totalStock,
                  reserved: 0,
                  updatedBy: userId,
                },
              },
            },
            include: { stock: true },
          });

          // 2a-ter. Multi-catégories : lignes de jointure CategoryProduct
          if (categoryIds.length > 0) {
            await tx.categoryProduct.createMany({
              data: categoryIds.map((categoryId, index) => ({
                productId: product.id,
                categoryId,
                displayOrder: index,
              })),
            });
          }

          const stockId = product.stock!.id;

          // 2b. Création du prix (ProductPrice) avec compareAtPrice optionnel
          await tx.productPrice.create({
            data: {
              productId: product.id,
              currency: input.currency ?? Currency.USD,
              amount: input.basePrice,
              compareAtPrice: input.compareAtPrice ?? null,
            },
          });

          // 2c. Création des variantes + audit de stock
          let variantCount = 0;
          for (let i = 0; i < variants.length; i++) {
            const variantInput = variants[i];
            const sku =
              variantInput.sku ??
              (await ProductService.resolveUniqueVariantSku(tx, input.name, i));

            const variant = await tx.productVariant.create({
              data: {
                productId: product.id,
                sku,
                attributes: (variantInput.attributes ?? {}) as Prisma.InputJsonValue,
                priceOffset: variantInput.priceOffset ?? 0,
              },
            });
            variantCount++;

            // Traçabilité : mouvement de stock + transaction d'inventaire par variante.
            if (variantInput.initialStock > 0) {
              await tx.stockMovement.create({
                data: {
                  stockId,
                  type: StockMovementType.IN,
                  quantity: variantInput.initialStock,
                  delta: variantInput.initialStock,
                  reason: "INITIAL",
                  userId,
                },
              });
              await tx.inventoryTransaction.create({
                data: {
                  productId: product.id,
                  variantId: variant.id,
                  quantity: variantInput.initialStock,
                  reason: TransactionType.RESTOCK,
                  performedBy: userId,
                },
              });
            }
          }

          // 2d. Projection de disponibilité (source de vérité du catalogue)
          await tx.product_Availability_Projection.upsert({
            where: { productId: product.id },
            create: { productId: product.id, isAvailable: totalStock > 0 },
            update: { isAvailable: totalStock > 0 },
          });

          return {
            productId: product.id,
            variantCount,
            totalStock,
            slug,
          };
        }, TRANSACTION_OPTIONS);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < MAX_TRANSACTION_RETRIES
        ) {
          // Deadlock / échec de sérialisation : retry.
          continue;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const target = String(
            (error.meta as { target?: unknown } | undefined)?.target ?? ""
          ).toLowerCase();
          if (target.includes("slug")) {
            throw new ProductError(
              "Conflit de slug détecté (unicité). Recommencez la création.",
              PRODUCT_ERROR_CODES.SLUG_CONFLICT
            );
          }
          if (target.includes("sku")) {
            throw new ProductError(
              "Conflit de SKU détecté (unicité).",
              PRODUCT_ERROR_CODES.SKU_CONFLICT
            );
          }
        }
        throw error;
      }
    }
  }

    /**
   * Alias public — appelé par app/api/admin/products/route.ts.
   * Délègue vers createDynamicProduct pour garder une API unifiée.
   */
  static createProduct(rawInput: unknown, userId: string) {
    return ProductService.createDynamicProduct(rawInput, userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOUVEMENTS DE STOCK (anti-overselling)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Entrée de stock positive (restock / réception / retour).
   * Le stock physique est incrémenté de manière atomique.
   */
  static async addStock(
    input: StockMovementInput,
    userId: string
  ): Promise<{ variantId: string; newStock: number; movementId: string }> {
    if (input.quantity <= 0) {
      throw new ProductError(
        "La quantité d'entrée doit être strictement positive.",
        PRODUCT_ERROR_CODES.INVALID_QUANTITY
      );
    }

    const { stockType, txType } = ProductService.mapReasons(input.reason, input.quantity);

    return prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: input.variantId },
        select: { productId: true },
      });
      if (!variant) {
        throw new ProductError(
          `La variante '${input.variantId}' est introuvable.`,
          PRODUCT_ERROR_CODES.VARIANT_NOT_FOUND
        );
      }

      const stock = await tx.stock.update({
        where: { productId: variant.productId },
        data: {
          quantity: { increment: input.quantity },
          lastMovementAt: new Date(),
          updatedBy: input.userId ?? userId,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          type: stockType,
          quantity: input.quantity,
          delta: input.quantity,
          reason: input.reason,
          referenceId: input.referenceId ?? undefined,
          userId: input.userId ?? userId,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: variant.productId,
          variantId: input.variantId,
          quantity: input.quantity,
          reason: txType,
          referenceId: input.referenceId ?? undefined,
          performedBy: input.userId ?? userId,
        },
      });

      await tx.product_Availability_Projection.upsert({
        where: { productId: variant.productId },
        create: { productId: variant.productId, isAvailable: true },
        update: { isAvailable: true },
      });

      return { variantId: input.variantId, newStock: stock.quantity, movementId: movement.id };
    }, TRANSACTION_OPTIONS);
  }

  /**
   * Sortie de stock (vente / ajustement négatif).
   * La garde `quantity >= X` dans le WHERE rend toute vente en négatif
   * strictement impossible, même sous forte concurrence.
   *
   * @param input.quantity Doit être NÉGATIF (décrément).
   */
  static async removeStock(
    input: StockMovementInput,
    userId: string
  ): Promise<{ variantId: string; newStock: number; movementId: string }> {
    if (input.quantity >= 0) {
      throw new ProductError(
        "La quantité de sortie doit être strictement négative.",
        PRODUCT_ERROR_CODES.INVALID_QUANTITY
      );
    }

    const required = Math.abs(input.quantity);
    const { stockType, txType } = ProductService.mapReasons(input.reason, input.quantity);

    return prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: input.variantId },
        select: { productId: true },
      });
      if (!variant) {
        throw new ProductError(
          `La variante '${input.variantId}' est introuvable.`,
          PRODUCT_ERROR_CODES.VARIANT_NOT_FOUND
        );
      }

      // Mise à jour conditionnelle ATOMIQUE : ne décrémente que si stock suffisant.
      const result = await tx.stock.updateMany({
        where: {
          productId: variant.productId,
          quantity: { gte: required },
        },
        data: {
          quantity: { decrement: required },
          lastMovementAt: new Date(),
          updatedBy: input.userId ?? userId,
        },
      });

      if (result.count === 0) {
        throw new ProductError(
          `Stock insuffisant pour la variante '${input.variantId}' (demande : ${required}).`,
          PRODUCT_ERROR_CODES.INSUFFICIENT_STOCK
        );
      }

      const stock = await tx.stock.findUniqueOrThrow({
        where: { productId: variant.productId },
      });

      const movement = await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          type: stockType,
          quantity: input.quantity,
          delta: -required,
          reason: input.reason,
          referenceId: input.referenceId ?? undefined,
          userId: input.userId ?? userId,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: variant.productId,
          variantId: input.variantId,
          quantity: input.quantity,
          reason: txType,
          referenceId: input.referenceId ?? undefined,
          performedBy: input.userId ?? userId,
        },
      });

      // Mise à jour de la projection de disponibilité si rupture.
      const isAvailable = stock.quantity - required > 0;
      await tx.product_Availability_Projection.upsert({
        where: { productId: variant.productId },
        create: { productId: variant.productId, isAvailable },
        update: { isAvailable },
      });

      return {
        variantId: input.variantId,
        newStock: stock.quantity - required,
        movementId: movement.id,
      };
    }, TRANSACTION_OPTIONS);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Slug unique : si le slug de base est pris, suffixe incrémental.
   * Élimine tout conflit de slug à la création.
   */
  private static async resolveUniqueSlug(tx: Tx, name: string): Promise<string> {
    const base = slugify(name) || "produit";
    let slug = base;
    for (let attempt = 1; attempt <= 10; attempt++) {
      const exists = await tx.product.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!exists) return slug;
      slug = `${base}-${attempt}`;
    }
    throw new ProductError(
      "Impossible de générer un slug unique pour ce produit.",
      PRODUCT_ERROR_CODES.SLUG_GENERATION_FAILED
    );
  }

  /** SKU produit unique (contrainte Prisma @unique sur Product.sku). */
  private static async resolveUniqueProductSku(tx: Tx, name: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const sku = generateSKU(name);
      const exists = await tx.product.findUnique({ where: { sku }, select: { id: true } });
      if (!exists) return sku;
    }
    throw new ProductError(
      "Impossible de générer un SKU produit unique.",
      PRODUCT_ERROR_CODES.SKU_GENERATION_FAILED
    );
  }

  /** SKU variante unique (contrainte Prisma @unique sur ProductVariant.sku). */
  private static async resolveUniqueVariantSku(
    tx: Tx,
    name: string,
    index: number
  ): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const sku = generateSKU(`${name}-${index}`);
      const exists = await tx.productVariant.findUnique({ where: { sku }, select: { id: true } });
      if (!exists) return sku;
    }
    throw new ProductError(
      "Impossible de générer un SKU de variante unique.",
      PRODUCT_ERROR_CODES.SKU_GENERATION_FAILED
    );
  }

  /** Mappe une raison (chaine API) vers les enums du schéma réel. */
  private static mapReasons(
    reason: string,
    quantity: number
  ): { stockType: StockMovementType; txType: TransactionType } {
    switch (reason.toUpperCase()) {
      case "PURCHASE":
      case "INITIAL":
      case "RESTOCK":
        return { stockType: StockMovementType.IN, txType: TransactionType.RESTOCK };
      case "SALE":
        return { stockType: StockMovementType.OUT, txType: TransactionType.SALE };
      case "RETURN":
        return { stockType: StockMovementType.RETURN, txType: TransactionType.RETURN };
      case "SHRINKAGE":
        return { stockType: StockMovementType.ADJUSTMENT, txType: TransactionType.SHRINKAGE };
      default:
        // ADJUSTMENT : positif = restock, négatif = shrinkage.
        return {
          stockType: StockMovementType.ADJUSTMENT,
          txType: quantity >= 0 ? TransactionType.RESTOCK : TransactionType.SHRINKAGE,
        };
    }
  }
}
