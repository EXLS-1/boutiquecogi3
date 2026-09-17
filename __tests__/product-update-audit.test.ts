// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  product: { findUnique: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: (fn: (tx: typeof db) => Promise<void>) => fn(db) },
}));
vi.mock("@/lib/products/product.service", () => ({
  ProductServiceError: class extends Error {
    constructor(message: string, public code: string) { super(message); }
  },
}));

import { updateProduct } from "@/lib/products/product-service-helpers";

const productId = "00000000-0000-4000-8000-000000000001";
const actor = { userId: "00000000-0000-4000-8000-000000000002" };

beforeEach(() => {
  vi.resetAllMocks();
  db.product.findUnique.mockResolvedValue({ isdeleted: false });
});

describe("updateProduct audit payload", () => {
  it.each([
    { description: undefined, expected: {} },
    { description: null, expected: { description: "" } },
    { description: "", expected: { description: "" } },
    { description: "Description", expected: { description: "Description" } },
  ])("maps description $description consistently for update and audit", async ({ description, expected }) => {
    await updateProduct(productId, { description }, actor);

    expect(db.product.update).toHaveBeenCalledWith({ where: { id: productId }, data: expected });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ newValue: expected, userId: actor.userId, entityId: productId }),
    });
  });

  it("preserves scalar fields including zero and false in the audit", async () => {
    const input = { name: "Produit", sku: "SKU-TEST", basePrice: 0, salePrice: 0, isActive: false, isFeatured: false };
    await updateProduct(productId, input, actor);

    expect(db.product.update).toHaveBeenCalledWith({ where: { id: productId }, data: input });
    expect(db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ newValue: input }) });
  });
});
