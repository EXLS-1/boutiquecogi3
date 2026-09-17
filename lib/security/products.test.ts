// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { RBACLevel } from "./audit";

const db = vi.hoisted(() => ({
  product: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
  productVariant: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/currency/exchange-rate-constants", () => ({ DEFAULT_USD_TO_CDF_RATE: 2350 }));

import {
  parseCreateProductInput, parseUpdateProductInput, parseDeleteProductInput,
  ProductValidationError, ProductPermissionError, getAllProducts,
  getProductById, getProductsByIds,
} from "./products";

const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => vi.resetAllMocks());

describe("product input validation", () => {
  it("applies creation defaults", () => {
    expect(parseCreateProductInput({ name: "Produit", basePrice: 1250, sku: "SKU", actorLevel: "LEVEL_1" }))
      .toMatchObject({ description: "", images: [], initialStock: 0, isPublished: false });
  });
  it("rejects invalid creation data", () => {
    expect(() => parseCreateProductInput({ name: "", basePrice: -1 })).toThrow(ProductValidationError);
  });
  it("rejects metadata-only updates but accepts false and zero", () => {
    expect(() => parseUpdateProductInput({ id, actorLevel: "LEVEL_1" })).toThrow(ProductValidationError);
    expect(parseUpdateProductInput({ id, actorLevel: "LEVEL_1", basePrice: 0, isPublished: false }))
      .toMatchObject({ basePrice: 0, isPublished: false });
  });
  it("defaults to non-permanent deletion and validates identifiers", () => {
    expect(parseDeleteProductInput({ id, actorLevel: "LEVEL_1" }).permanent).toBe(false);
    expect(() => parseDeleteProductInput({ id: "bad", actorLevel: "LEVEL_1" })).toThrow(ProductValidationError);
  });
});

describe("product reads", () => {
  it("rejects invalid runtime roles before accessing the database", async () => {
    const invalidRole = "UNKNOWN" as RBACLevel;
    await expect(getProductById(id, invalidRole)).rejects.toThrow(ProductPermissionError);
    await expect(getProductsByIds([id], invalidRole)).rejects.toThrow(ProductPermissionError);
    await expect(getAllProducts({ actorLevel: invalidRole })).rejects.toThrow(ProductPermissionError);
    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(db.productVariant.findFirst).not.toHaveBeenCalled();
  });
  it("denies archived listings to guests", async () => {
    await expect(getAllProducts({ includeArchived: true })).rejects.toThrow(ProductPermissionError);
    expect(db.product.findMany).not.toHaveBeenCalled();
  });
  it("maps Decimal cents without losing dollar cents", async () => {
    db.product.findMany.mockResolvedValue([{
      id, name: "Produit", description: null, basePrice: new Prisma.Decimal(1299),
      images: [], category: null, variants: [],
    }]);
    db.product.count.mockResolvedValue(1);
    const result = await getAllProducts();
    expect(result.products[0]).toMatchObject({ priceUSD: 12.99, priceCDF: Math.round(12.99 * 2350) });
  });
  it("does not return archived products found through a variant", async () => {
    db.productVariant.findFirst.mockResolvedValue({ product: { isArchived: true } });
    db.product.findFirst.mockResolvedValue(null);
    await expect(getProductById(id)).resolves.toBeNull();
  });
});
