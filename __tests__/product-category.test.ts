// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Prisma } from "@prisma/client";

vi.mock("@/server/services/product-service", () => ({
  ProductServiceError: class extends Error {
    constructor(message: string, public code: string) { super(message); }
  },
}));

import {
  normalizeCategoryIds,
  syncProductCategories,
  validateCategoriesExist,
} from "@/server/services/product-category-sync";

const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const productId = "00000000-0000-4000-8000-000000000003";
const category = (id: string, deletedAt: Date | null = null): Category => ({
  id, name: id, slug: id, description: null, subtitle: "", image: null,
  isNavigable: true, managedByRoles: [], requiredPermission: "products:read",
  minRoleLevel: 6, displayOrder: 0, OrderBy: "asc", parentId: null,
  seoTitle: null, seoDescription: null, deletedAt,
  createdAt: new Date(), updatedAt: new Date(),
});
const db = {
  category: { findMany: vi.fn() },
  categoryProduct: { deleteMany: vi.fn(), createMany: vi.fn() },
  product: { update: vi.fn() },
};
const tx = db as unknown as Prisma.TransactionClient;
beforeEach(() => vi.resetAllMocks());

describe("product category regression", () => {
  it("normalizes whitespace and duplicates while retaining the primary category", () => {
    expect(normalizeCategoryIds(` ${second} `, [first, second])).toEqual([second, first]);
  });
  it("returns categories in requested order, not database order", async () => {
    db.category.findMany.mockResolvedValue([category(first), category(second)]);
    expect((await validateCategoriesExist(tx, [second, first])).map(c => c.id))
      .toEqual([second, first]);
  });
  it("rejects a soft-deleted category", async () => {
    db.category.findMany.mockResolvedValue([category(first, new Date())]);
    await expect(validateCategoriesExist(tx, [first])).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
  });
  it("rejects an unknown category", async () => {
    db.category.findMany.mockResolvedValue([]);
    await expect(validateCategoriesExist(tx, [first])).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
  });
  it("replaces associations with deterministic order and primary category", async () => {
    db.category.findMany.mockResolvedValue([category(first), category(second)]);
    await syncProductCategories(tx, productId, [second, first]);
    expect(db.categoryProduct.createMany).toHaveBeenCalledWith({ data: [
      { productId, categoryId: second, displayOrder: 0 },
      { productId, categoryId: first, displayOrder: 1 },
    ] });
    expect(db.product.update).toHaveBeenCalledWith({ where: { id: productId }, data: { categoryId: second } });
  });
  it("clears the primary category and every association", async () => {
    await syncProductCategories(tx, productId, []);
    expect(db.categoryProduct.deleteMany).toHaveBeenCalledWith({ where: { productId } });
    expect(db.categoryProduct.createMany).not.toHaveBeenCalled();
    expect(db.product.update).toHaveBeenCalledWith({ where: { id: productId }, data: { categoryId: null } });
  });
});
