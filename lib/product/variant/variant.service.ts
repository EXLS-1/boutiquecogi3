import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductError, ProductServiceError } from "@/lib/product/product-errors";
import { PRODUCT_LIMITS } from "@/lib/product/product-constant";
import { adjustStockInTx } from "@/lib/product/inventory/inventory.service";

export interface VariantInput {
  sku?: string;
  attributes?: Record<string, string | number | boolean>;
  priceOffset?: number;
  initialStock: number;
}

interface CreateVariantInput extends VariantInput {
  productId: string;
}

interface BulkGenerateVariantsInput {
  productId: string;
  variants: VariantInput[];
}

interface UpdateVariantInput {
  sku?: string;
  attributes?: Record<string, string | number | boolean>;
  priceOffset?: number;
  isActive?: boolean;
}

async function assertVariantCapacity(
  tx: Prisma.TransactionClient,
  productId: string,
  requestedCount: number,
) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      isdeleted: true,
      productType: { select: { isActive: true, maxVariants: true } },
      _count: { select: { variants: true } },
    },
  });
  if (!product || product.isdeleted) {
    throw new ProductServiceError("Produit introuvable", "NOT_FOUND", 404);
  }
  if (!product.productType.isActive) {
    throw new ProductServiceError("Le type de produit est inactif", "INVALID_PRODUCT_TYPE", 409);
  }

  const maxVariants = Math.min(product.productType.maxVariants, PRODUCT_LIMITS.VARIANT_MAX);
  if (product._count.variants + requestedCount > maxVariants) {
    throw new ProductServiceError(
      `Le produit ne peut pas dépasser ${maxVariants} variantes`,
      "VARIANT_LIMIT_EXCEEDED",
      400,
    );
  }
}

function createSku(productId: string, sku?: string): string {
  return sku?.trim() || `VAR-${productId.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
}

async function createVariantInTransaction(
  tx: Prisma.TransactionClient,
  productId: string,
  input: VariantInput,
  userId: string,
) {
  if (!Number.isSafeInteger(input.initialStock) || input.initialStock < 0) {
    throw new ProductError("Le stock initial doit être un entier positif ou nul", "VALIDATION_ERROR", 400);
  }
  if (input.priceOffset !== undefined && !Number.isFinite(input.priceOffset)) {
    throw new ProductError("Le supplément de prix est invalide", "VALIDATION_ERROR", 400);
  }

  const attributes: Prisma.InputJsonObject = Object.fromEntries(
    Object.entries(input.attributes ?? {}),
  );
  const variant = await tx.productVariant.create({
    data: {
      productId,
      sku: createSku(productId, input.sku),
      attributes,
      priceOffset: input.priceOffset ?? 0,
    },
  });

  if (input.initialStock > 0) {
    await adjustStockInTx(tx, {
      variantId: variant.id,
      delta: input.initialStock,
      reason: "INITIAL",
      notes: "Stock initial de la variante",
      userId,
    });
  }

  return variant;
}

export async function createVariant(input: CreateVariantInput, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertVariantCapacity(tx, input.productId, 1);
      return createVariantInTransaction(tx, input.productId, input, userId);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ProductServiceError("Le SKU de la variante existe déjà", "SKU_CONFLICT", 409);
    }
    throw error;
  }
}

export async function bulkGenerateVariants(
  input: BulkGenerateVariantsInput,
  userId: string,
) {
  if (input.variants.length === 0) {
    throw new ProductError("Au moins une variante est requise", "VALIDATION_ERROR", 400);
  }

  try {
    const variants = await prisma.$transaction(async (tx) => {
      await assertVariantCapacity(tx, input.productId, input.variants.length);
      const created = [];
      for (const variant of input.variants) {
        created.push(await createVariantInTransaction(tx, input.productId, variant, userId));
      }
      return created;
    }, { isolationLevel: "Serializable" });

    return { variants, variantCount: variants.length };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ProductServiceError("Un SKU de variante existe déjà", "SKU_CONFLICT", 409);
    }
    throw error;
  }
}

export async function updateVariant(
  variantId: string,
  input: UpdateVariantInput,
) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true },
  });
  if (!variant) {
    throw new ProductServiceError("Variante introuvable", "NOT_FOUND", 404);
  }

  const attributes: Prisma.InputJsonObject | undefined = input.attributes
    ? Object.fromEntries(Object.entries(input.attributes))
    : undefined;

  try {
    return await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(input.sku !== undefined && { sku: input.sku.trim() }),
        ...(attributes !== undefined && { attributes }),
        ...(input.priceOffset !== undefined && { priceOffset: input.priceOffset }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ProductServiceError("Le SKU de la variante existe déjà", "SKU_CONFLICT", 409);
    }
    throw error;
  }
}

export async function deleteVariant(variantId: string, reason?: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, isActive: true },
  });
  if (!variant) {
    throw new ProductServiceError("Variante introuvable", "NOT_FOUND", 404);
  }
  if (!variant.isActive) {
    throw new ProductServiceError("La variante est déjà désactivée", "VARIANT_INACTIVE", 409);
  }

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { isActive: false },
  });
  return { deleted: true, reason };
}