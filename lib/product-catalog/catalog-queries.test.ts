// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany } } }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock("@/lib/currency/exchange-rate-constants", () => ({ DEFAULT_USD_TO_CDF_RATE: 2350 }));

import { getRecentProducts, getProductsByCategory, getPromotionalProducts, getNewArrivalProducts, getFeaturedProducts } from "./catalog-queries";

beforeEach(() => vi.resetAllMocks());

it.each([
  ["recent", () => getRecentProducts()],
  ["category", () => getProductsByCategory("femme")],
  ["promotions", () => getPromotionalProducts()],
  ["new arrivals", () => getNewArrivalProducts()],
  ["featured", () => getFeaturedProducts()],
] as const)("returns an empty typed result without fetching relations: %s", async (_name, query) => {
  findMany.mockResolvedValue([]);
  await expect(query()).resolves.toEqual([]);
  expect(findMany).toHaveBeenCalledTimes(1);
  expect(findMany.mock.calls[0][0]).toHaveProperty("select", { id: true });
});
