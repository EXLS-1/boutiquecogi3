import { describe, expect, it } from "vitest";
import { buildProductVariantConfig } from "@/lib/product-catalog/product-variant-config";

const productId = "00000000-0000-4000-8000-000000000001";
const variantId = "00000000-0000-4000-8000-000000000002";

function variant(overrides: Partial<{
  id: string;
  isActive: boolean;
  priceOffset: number;
  attributes: unknown;
  quantity: number;
  reserved: number;
}> = {}) {
  return {
    id: variantId,
    sku: "SKU-BLEU-M",
    attributes: { couleur: "Bleu", taille: "M", matiere: "Coton" },
    priceOffset: 250,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    variantStocks: [{ quantity: 8, reserved: 2 }],
    ...overrides,
  };
}

describe("buildProductVariantConfig", () => {
  it("maps Prisma attributes, cents offsets, and available stock", () => {
    const config = buildProductVariantConfig({
      id: productId,
      currency: "USD",
      basePrice: 25,
      variants: [variant()],
    });

    expect(config?.variants[0]).toMatchObject({
      id: variantId,
      priceAdjustment: 2.5,
      stockQuantity: 6,
      isDefault: true,
      color: { label: "Bleu" },
      size: { label: "M", sizeSystem: "ALPHABETIC" },
      material: { label: "Coton" },
    });
  });

  it("excludes inactive variants and chooses an in-stock default", () => {
    const config = buildProductVariantConfig({
      id: productId,
      currency: "USD",
      basePrice: 25,
      variants: [
        variant({ id: "00000000-0000-4000-8000-000000000003", quantity: 0, reserved: 0 }),
        variant({ id: "00000000-0000-4000-8000-000000000004", isActive: false }),
      ],
    });

    expect(config?.variants).toHaveLength(1);
    expect(config?.variants[0].id).toBe("00000000-0000-4000-8000-000000000003");
  });

  it("returns null when no usable variant or price exists", () => {
    expect(buildProductVariantConfig({
      id: productId,
      currency: "USD",
      basePrice: 25,
      variants: [variant({ isActive: false })],
    })).toBeNull();
    expect(buildProductVariantConfig({
      id: productId,
      currency: "USD",
      basePrice: 0,
      variants: [variant()],
    })).toBeNull();
  });
});
