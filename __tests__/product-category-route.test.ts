// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  product: { findFirst: vi.fn(), update: vi.fn() },
  category: { findMany: vi.fn() },
  categoryProduct: { deleteMany: vi.fn(), createMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { PUT } from "@/app/api/product/[id]/route";

const productId = "00000000-0000-4000-8000-000000000001";
const first = "00000000-0000-4000-8000-000000000002";
const second = "00000000-0000-4000-8000-000000000003";

function put(body: unknown) {
  return PUT(new NextRequest(`http://localhost/api/product/${productId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: productId }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  db.product.findFirst.mockResolvedValue({ id: productId });
  db.product.update.mockResolvedValue({ id: productId });
  db.category.findMany.mockResolvedValue([
    { id: second, deletedAt: null },
    { id: first, deletedAt: null },
  ]);
  db.$transaction.mockImplementation(async (operation: (tx: typeof db) => Promise<unknown>) => operation(db));
});

describe("PUT product category integration (Prisma mocked)", () => {
  it("preserves request order even when Prisma returns categories in reverse order", async () => {
    const response = await put({ categoryIds: [first, second] });
    expect(response.status).toBe(200);
    expect(db.categoryProduct.createMany).toHaveBeenCalledWith({ data: [
      { productId, categoryId: first, displayOrder: 0 },
      { productId, categoryId: second, displayOrder: 1 },
    ] });
    expect(db.product.update).toHaveBeenCalledWith({
      where: { id: productId }, data: { categoryId: first },
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-string categoryId with a client error before any write", async () => {
    const response = await put({ categoryId: 123 });
    expect([400, 422]).toContain(response.status);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.categoryProduct.deleteMany).not.toHaveBeenCalled();
    expect(db.product.update).not.toHaveBeenCalled();
  });
});
