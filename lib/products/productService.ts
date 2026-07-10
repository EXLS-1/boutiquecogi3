// lib/products/productService.ts
import { prisma } from "@/lib/prisma";
import { OutboxService } from "@/lib/events/outboxService";
import { ProductValidationService } from "./validationService";
import type { CreateProductInput, StockMovementInput } from "./types";

export class ProductService {
  /**
   * Crée un produit dynamique avec stock initial.
   * Tout est transactionnel + Outbox.
   */
  static async createProduct(input: CreateProductInput, userId: string): Promise<{
    productId: string;
    variantCount: number;
    totalStock: number;
  }> {
    // 1. Validation dynamique
    const { fullSchema, template, hasVariantAttributes } = 
      await ProductValidationService.buildSchema(input.categoryId);
    
    const validated = fullSchema.parse(input);

    // 2. Vérification unicité slug
    const existing = await prisma.product.findUnique({
      where: { slug: validated.slug },
    });
    if (existing) throw new Error(`Product with slug '${validated.slug}' already exists`);

    // 3. Génération des variants si non fournis mais requis par le template
    let variants = validated.variants || [];
    if (hasVariantAttributes && variants.length === 0) {
      // L'admin n'a pas fourni de variants explicitement, on génère les combinaisons
      const combinations = ProductValidationService.generateVariantCombinations(
        template,
        validated.attributes as Record<string, string | number | boolean>
      );
      
      variants = combinations.map((combo, i) => ({
        attributes: combo,
        priceAdjustment: 0,
        initialStock: 0, // Stock initial à 0, l'admin doit faire un mouvement de stock après
        isDefault: i === 0,
      }));
    }

    // 4. Transaction : Product + Variants + Stock + Attributes + Images + Outbox
    const result = await prisma.$transaction(async (tx) => {
      // 4a. Créer le produit parent
      const product = await tx.product.create({
        data: {
          name: validated.name,
          slug: validated.slug,
          description: validated.description,
          basePrice: validated.basePrice,
          compareAtPrice: validated.compareAtPrice,
          catalogId: validated.catalogId,
          categoryId: validated.categoryId,
          metadata: validated.metadata || {},
          hasVariants: variants.length > 0,
          images: {
            create: validated.images?.map((img, i) => ({
              url: img.url,
              altText: img.altText,
              isPrimary: img.isPrimary || i === 0,
              sortOrder: i,
            })) || [],
          },
        },
      });

      // 4b. Créer les ProductAttributeValue (indexables)
      const indexableAttrs = Object.entries(template)
        .filter(([, config]) => config.indexable)
        .map(([key]) => key);

      for (const [key, value] of Object.entries(validated.attributes)) {
        if (indexableAttrs.includes(key) && value !== undefined) {
          await tx.productAttributeValue.create({
            data: {
              productId: product.id,
              attributeKey: key,
              attributeValue: String(value),
              valueType: typeof value === "number" ? "number" : "string",
              numericValue: typeof value === "number" ? value : null,
            },
          });
        }
      }

      // 4c. Créer les variants + stock initial
      let totalStock = 0;
      const createdVariants = [];

      for (let i = 0; i < variants.length; i++) {
        const variantInput = variants[i];
        
        // Génération SKU : CATALOG-CATEGORY-PRODUCT-INDEX-HASH
        const sku = this.generateSKU(product.id, i, variantInput.attributes);

        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku,
            variantName: this.buildVariantName(variantInput.attributes),
            attributes: variantInput.attributes,
            priceAdjustment: variantInput.priceAdjustment || 0,
            isDefault: variantInput.isDefault || false,
            images: variantInput.images || [],
          },
        });

        createdVariants.push(variant);

        // Stock initial (ledger)
        if (variantInput.initialStock > 0) {
          await tx.stockLedger.create({
            data: {
              variantId: variant.id,
              quantity: variantInput.initialStock,
              reason: "INITIAL",
              previousStock: 0,
              newStock: variantInput.initialStock,
              userId,
              notes: "Stock initial à la création du produit",
            },
          });

          // Mise à jour du cache dénormalisé
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { cachedStock: variantInput.initialStock, cachedStockAt: new Date() },
          });

          totalStock += variantInput.initialStock;
        }
      }

      // 4d. Outbox Event
      await OutboxService.emit(tx, [
        {
          eventType: "ProductCreated",
          aggregateType: "Product",
          aggregateId: product.id,
          catalogId: validated.catalogId,
          payload: {
            productId: product.id,
            variantCount: createdVariants.length,
            totalStock,
            hasVariants: variants.length > 0,
            categoryId: validated.categoryId,
          },
          headers: {
            userId,
            correlationId: crypto.randomUUID(),
          },
        },
      ]);

      return { productId: product.id, variantCount: createdVariants.length, totalStock };
    }, {
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 15000,
    });

    return result;
  }

  /**
   * Ajoute du stock à un variant existant (mouvement de stock).
   */
  static async addStock(input: StockMovementInput, userId: string): Promise<{
    variantId: string;
    newStock: number;
    movementId: string;
  }> {
    if (input.quantity <= 0) throw new Error("Stock addition quantity must be positive");

    const result = await prisma.$transaction(async (tx) => {
      // Verrou pessimiste sur le variant
      const variant = await tx.productVariant.findUnique({
        where: { id: input.variantId },
        include: { product: { select: { catalogId: true } } },
      });
      
      if (!variant) throw new Error("Variant not found");
      if (!variant.isActive) throw new Error("Variant is inactive");

      const previousStock = variant.cachedStock;
      const newStock = previousStock + input.quantity;

      // 1. Créer le mouvement dans le ledger
      const ledger = await tx.stockLedger.create({
        data: {
          variantId: input.variantId,
          quantity: input.quantity,
          reason: input.reason,
          referenceId: input.referenceId,
          referenceType: input.referenceType,
          userId: input.userId || userId,
          previousStock,
          newStock,
          notes: input.notes,
        },
      });

      // 2. Mettre à jour le cache dénormalisé
      await tx.productVariant.update({
        where: { id: input.variantId },
        data: { cachedStock: newStock, cachedStockAt: new Date() },
      });

      // 3. Outbox Event
      await OutboxService.emit(tx, [
        {
          eventType: "ProductStockChanged",
          aggregateType: "Product",
          aggregateId: variant.productId,
          catalogId: variant.product.catalogId,
          payload: {
            variantId: input.variantId,
            previousStock,
            newStock,
            delta: input.quantity,
            reason: input.reason,
            referenceId: input.referenceId,
          },
          headers: {
            userId: input.userId || userId,
            correlationId: crypto.randomUUID(),
          },
        },
      ]);

      return { variantId: input.variantId, newStock, movementId: ledger.id };
    }, {
      isolationLevel: "Serializable",
      maxWait: 3000,
      timeout: 10000,
    });

    return result;
  }

  /**
   * Retire du stock (vente, ajustement négatif).
   */
  static async removeStock(input: StockMovementInput, userId: string): Promise<{
    variantId: string;
    newStock: number;
    movementId: string;
  }> {
    if (input.quantity >= 0) throw new Error("Stock removal quantity must be negative");

    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: input.variantId },
        include: { product: { select: { catalogId: true } } },
      });
      
      if (!variant) throw new Error("Variant not found");

      const previousStock = variant.cachedStock;
      const newStock = previousStock + input.quantity; // quantity est négatif

      if (newStock < 0) throw new Error(`Insufficient stock: ${previousStock} available, requested ${Math.abs(input.quantity)}`);

      const ledger = await tx.stockLedger.create({
        data: {
          variantId: input.variantId,
          quantity: input.quantity,
          reason: input.reason,
          referenceId: input.referenceId,
          referenceType: input.referenceType,
          userId: input.userId || userId,
          previousStock,
          newStock,
          notes: input.notes,
        },
      });

      await tx.productVariant.update({
        where: { id: input.variantId },
        data: { cachedStock: newStock, cachedStockAt: new Date() },
      });

      await OutboxService.emit(tx, [
        {
          eventType: "ProductStockChanged",
          aggregateType: "Product",
          aggregateId: variant.productId,
          catalogId: variant.product.catalogId,
          payload: {
            variantId: input.variantId,
            previousStock,
            newStock,
            delta: input.quantity,
            reason: input.reason,
          },
          headers: {
            userId: input.userId || userId,
            correlationId: crypto.randomUUID(),
          },
        },
      ]);

      return { variantId: input.variantId, newStock, movementId: ledger.id };
    }, {
      isolationLevel: "Serializable",
      maxWait: 3000,
      timeout: 10000,
    });

    return result;
  }

  // ==================== HELPERS ====================

  private static generateSKU(
    productId: string,
    index: number,
    attributes: Record<string, unknown>
  ): string {
    const attrHash = Object.values(attributes)
      .map(v => String(v).substring(0, 3).toUpperCase())
      .join("-");
    const productShort = productId.substring(0, 8).toUpperCase();
    return `SKU-${productShort}-${index}-${attrHash}`;
  }

  private static buildVariantName(attributes: Record<string, unknown>): string {
    return Object.entries(attributes)
      .map(([key, val]) => `${key}: ${val}`)
      .join(" / ");
  }
}
