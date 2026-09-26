import { describe, expect, it } from "vitest";

import {
  clampVariantQuantity,
  getVariantQuantityLimit,
} from "./product-variant";

describe("variant quantity limits", () => {
  it("caps an in-stock quantity at the available stock and order limit", () => {
    expect(getVariantQuantityLimit(3, 10)).toBe(3);
    expect(getVariantQuantityLimit(10, 3)).toBe(3);
    expect(getVariantQuantityLimit(4.9, 10)).toBe(4);
  });

  it("treats invalid, zero, or negative stock as unavailable", () => {
    expect(getVariantQuantityLimit(0, 10)).toBe(0);
    expect(getVariantQuantityLimit(-2, 10)).toBe(0);
    expect(getVariantQuantityLimit(Number.NaN, 10)).toBe(0);
  });

  it("clamps quantity to the effective range", () => {
    expect(clampVariantQuantity(0, 3)).toBe(1);
    expect(clampVariantQuantity(5, 3)).toBe(3);
    expect(clampVariantQuantity(2.9, 3)).toBe(2);
    expect(clampVariantQuantity(Number.POSITIVE_INFINITY, 3)).toBe(1);
  });
});
