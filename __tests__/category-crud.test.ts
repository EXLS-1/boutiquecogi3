// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createCategory, updateCategory, deleteCategory, validateCategoryParent,
  categoryTransaction, assertCategoryManagement,
} from "@/lib/categories/repository";
import { createCategorySchema, updateCategorySchema } from "@/lib/categories/schemas";

const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const row = { id, parentId: null, deletedAt: null, managedByRoles: [], minRoleLevel: 6 };
const db = {
  category: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
  product: { count: vi.fn() }, categoryProduct: { count: vi.fn() }, catalog: { count: vi.fn() },
};
const tx = db as unknown as Prisma.TransactionClient;
beforeEach(() => {
  vi.resetAllMocks();
  db.category.findUnique.mockResolvedValue(row);
  for (const table of [db.category, db.product, db.categoryProduct, db.catalog]) table.count.mockResolvedValue(0);
});

describe("category CRUD", () => {
  it("creates the required Prisma fields and a normalized slug", async () => {
    await createCategory(tx, { name: "  Robes été  " });
    expect(db.category.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: "Robes été", slug: "robes-ete", subtitle: "", OrderBy: "asc" }) });
  });
  it("maps legacy imageUrl to image and preserves the slug when renaming", async () => {
    await updateCategory(tx, id, { name: "Robes", imageUrl: "" });
    expect(db.category.update).toHaveBeenCalledWith({ where: { id }, data: { name: "Robes", image: null } });
  });
  it("refuses empty, unknown, privileged and ambiguous fields", () => {
    expect(updateCategorySchema.safeParse({}).success).toBe(false);
    expect(createCategorySchema.safeParse({ name: "Robes", minRoleLevel: 7 }).success).toBe(false);
    expect(updateCategorySchema.safeParse({ image: "", imageUrl: "" }).success).toBe(false);
    expect(updateCategorySchema.safeParse({ image: "javascript:alert(1)" }).success).toBe(false);
  });
  it("rejects a deleted parent", async () => {
    db.category.findUnique.mockResolvedValue({ ...row, deletedAt: new Date() });
    await expect(createCategory(tx, { name: "Robes", parentId: id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.category.create).not.toHaveBeenCalled();
  });
  it("rejects a cycle through descendants", async () => {
    db.category.findUnique.mockResolvedValue({ ...row, id: other, parentId: id });
    await expect(validateCategoryParent(tx, other, id)).rejects.toMatchObject({ code: "CATEGORY_CYCLE" });
  });
  it.each(["product", "categoryProduct", "category", "catalog"] as const)("blocks deletion with a %s relation", async table => {
    db[table].count.mockResolvedValue(1);
    await expect(deleteCategory(tx, id)).rejects.toMatchObject({ code: "CATEGORY_IN_USE" });
    expect(db.category.update).not.toHaveBeenCalled();
  });
  it("soft deletes an unused category without deleting products", async () => {
    await deleteCategory(tx, id);
    expect(db.category.update).toHaveBeenCalledWith({ where: { id }, data: { deletedAt: expect.any(Date), isNavigable: false } });
  });
  it("honors category management restrictions", () => {
    const category = row as unknown as Parameters<typeof assertCategoryManagement>[0];
    expect(() => assertCategoryManagement(category, "GUEST", 7)).toThrow();
    expect(() => assertCategoryManagement({ ...category, managedByRoles: ["ADMIN"] }, "EDITOR", 4)).toThrow();
  });
  it("retries serialization conflicts with a fresh transaction", async () => {
    const transaction = vi.fn().mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "7" })).mockResolvedValue("ok");
    const client = { $transaction: transaction } as unknown as Parameters<typeof categoryTransaction>[0];
    await expect(categoryTransaction(client, async () => "ok")).resolves.toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(2);
  });
  it("maps a duplicate name/slug to a domain conflict", async () => {
    const transaction = vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7" }));
    await expect(categoryTransaction({ $transaction: transaction } as unknown as Parameters<typeof categoryTransaction>[0], async () => null))
      .rejects.toMatchObject({ code: "CATEGORY_CONFLICT" });
  });
});
