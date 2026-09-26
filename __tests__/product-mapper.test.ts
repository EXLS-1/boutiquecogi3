// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { Prisma, type ProductStatus } from "@prisma/client";
// Le service de pricing importe le client Prisma : on le neutralise pour garder
// le test hermétique (aucune connexion DB) — même convention que product-update-audit.test.ts.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import {
  mapProductToListItem,
  mapProductToDetails,
  type ProductMapperRow,
} from "@/lib/product/product.mapper";
import type { ProductDetails } from "@/lib/product/types";
const rowId = "00000000-0000-4000-8000-000000000001";

const baseRow = (): ProductMapperRow => ({
  id: rowId,
  name: "Chemise",
  sku: "SKU-1",
  slug: "chemise",
  description: "Une chemise",
  basePrice: new Prisma.Decimal(19.99),
  price: null,
  currency: "USD",
  status: "DRAFT" as ProductStatus,
  isFeatured: false,
  isArchived: false,
  isActive: false,
  isdeleted: false,
  categoryId: null,
  deletedAt: null,
  scheduledAt: null,
  publishedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
});

describe("mapProductToListItem", () => {
  it("converts legacy Decimals and preserves a zero base price", () => {
    const item = mapProductToListItem({ ...baseRow(), basePrice: new Prisma.Decimal(0) });
    expect(item.basePriceCents).toBe(0);
  });

  it("keeps a zero compareAtPrice from the matching reference price", () => {
    const item = mapProductToListItem({
      ...baseRow(),
      productPrices: [{
        id: "00000000-0000-4000-8000-000000000002", currency: "USD",
        amount: 1999, compareAtPrice: 0, country: null, region: null, startsAt: null, endsAt: null,
      }],
    });
    expect(item.comparePriceCents).toBe(0);
  });

  it("ignores planned or geo prices when picking the comparison price", () => {
    const item = mapProductToListItem({
      ...baseRow(),
      productPrices: [{
        id: "00000000-0000-4000-8000-000000000002", currency: "USD",
        amount: 4999, compareAtPrice: 5999, country: "RDC", region: "Kin", startsAt: null, endsAt: null,
      }],
    });
    expect(item.comparePriceCents).toBeNull();
  });

  it("counts variants from _count.variants (not VariantStock)", () => {
    const item = mapProductToListItem({
      ...baseRow(),
      _count: { variants: 3, productImages: 1, catalogs: 2, productTags: 4 },
    });
    expect(item.variantCount).toBe(3);
  });

  it("derives availability from quantity minus reserved", () => {
    const item = mapProductToListItem({ ...baseRow(), stock: { quantity: 5, reserved: 2 } });
    expect(item.available).toBe(3);
  });

  it("clamps availability at zero when reserved exceeds quantity", () => {
    const item = mapProductToListItem({ ...baseRow(), stock: { quantity: 2, reserved: 5 } });
    expect(item.quantity).toBe(2);
    expect(item.reserved).toBe(5);
    expect(item.available).toBe(0);
  });
});

describe("mapProductToDetails", () => {
  /** Relation optionnelle : NonNullable avant d'indexer, sinon `[number]` est invalide. */
  type ProductPriceRow = NonNullable<ProductMapperRow["productPrices"]>[number];

  /** Base complète + surcharges explicites : un spread de Partial rendrait les champs optionnels. */
  const price = (overrides: Partial<ProductPriceRow> = {}): ProductPriceRow => {
    const base: ProductPriceRow = {
      id: rowId, currency: "USD", amount: 1999, compareAtPrice: null,
      country: null, region: null, startsAt: null, endsAt: null,
    };
    return {
      id: overrides.id ?? base.id,
      currency: overrides.currency ?? base.currency,
      amount: overrides.amount ?? base.amount,
      compareAtPrice: overrides.compareAtPrice ?? base.compareAtPrice,
      country: overrides.country ?? base.country,
      region: overrides.region ?? base.region,
      startsAt: overrides.startsAt ?? base.startsAt,
      endsAt: overrides.endsAt ?? base.endsAt,
    };
  };

  it("maps the full aggregate with cents conversion and ordering", () => {
    const row: ProductMapperRow = {
      ...baseRow(),
      productType: { id: rowId, type: "PHYSICAL", label: "Physique", maxVariants: 50, requiresApproval: false },
      variants: [{
        id: rowId, sku: "SKU-2", attributes: { taille: "XL" }, priceOffset: 500, isActive: true,
        variantStocks: [{ id: rowId, quantity: 10, reserved: 3, alertThreshold: 2, warehouseId: null }],
      }],
      catalogs: [{
        priceOverride: new Prisma.Decimal(9.99), isActive: true, catalog: { id: rowId, name: "Été" },
      }],
      categoryProducts: [
        { category: { id: rowId, name: "Femme", slug: "femme" }, displayOrder: 1 },
        { category: { id: rowId, name: "Hauts", slug: "hauts" }, displayOrder: 0 },
      ],
      productReviews: [{
        id: rowId, rating: 5, comment: "Parfait", isVerifiedPurchase: true,
        createdAt: new Date("2026-01-03T00:00:00Z"), user: { id: rowId, name: "Alice" },
      }],
      statusHistory: [{
        id: rowId, oldStatus: "DRAFT" as ProductStatus, newStatus: "PENDING" as ProductStatus,
        reason: "Soumis", changedAt: new Date("2026-01-04T00:00:00Z"),
        changedBy: { id: rowId, name: "Bob" },
      }],
    };
    const details: ProductDetails = mapProductToDetails(row);
    expect(details.basePrice).toBe(1999);
    expect(details.productType?.type).toBe("PHYSICAL");
    expect(details.variants[0].stock[0].available).toBe(7);
    // Catalog overrides are converted to cents, not raw Decimal.
    expect(details.catalogs[0].priceOverride).toBe(999);
    // Categories sorted by displayOrder: primary first.
    expect(details.categories.map((category) => category.slug)).toEqual(["hauts", "femme"]);
    expect(details.reviews[0].user).toEqual({ id: rowId, name: "Alice" });
    expect(details.statusHistory[0].changedBy).toEqual({ id: rowId, name: "Bob" });
  });

  it("sorts prices by geo specificity then currency", () => {
    const details = mapProductToDetails({
      ...baseRow(),
      productPrices: [
        price({ id: rowId, currency: "CDF", country: "RDC", region: null }),
        price({ id: rowId, country: "RDC", region: "Kin" }),
        price({ id: rowId }),
      ],
    });
    expect(details.prices.map((priceEntry) => priceEntry.country)).toEqual([null, "RDC", "RDC"]);
    expect(details.prices.map((priceEntry) => priceEntry.currency)).toEqual(["USD", "CDF", "USD"]);
  });

  it("keeps a null legacy price as null and a zero price as zero", () => {
    expect(mapProductToDetails({ ...baseRow(), price: null }).price).toBeNull();
    expect(mapProductToDetails({ ...baseRow(), price: new Prisma.Decimal(0) }).price).toBe(0);
  });

  it("rejects unsafe amounts instead of silently truncating", () => {
    expect(() => mapProductToDetails({ ...baseRow(), basePrice: new Prisma.Decimal("1e15") }))
      .toThrow(RangeError);
  });

  it("defaults every unloaded relation to an empty or null value", () => {
    const details = mapProductToDetails(baseRow());
    expect(details.variants).toEqual([]);
    expect(details.prices).toEqual([]);
    expect(details.images).toEqual([]);
    expect(details.tags).toEqual([]);
    expect(details.categories).toEqual([]);
    expect(details.catalogs).toEqual([]);
    expect(details.attributes).toEqual([]);
    expect(details.options).toEqual([]);
    expect(details.reviews).toEqual([]);
    expect(details.statusHistory).toEqual([]);
    expect(details.productType).toBeNull();
    expect(details.stock).toBeNull();
    expect(details.availability).toBe(false);
  });

  it("normalises a Prisma Json attribute payload into a flat record", () => {
    const variant = (attributes: Prisma.JsonValue) => ({
      id: rowId, sku: "SKU-X", attributes, priceOffset: 0, isActive: true,
      variantStocks: [{ id: rowId, quantity: 4, reserved: 1, alertThreshold: 10, warehouseId: null }],
    });

    const details = mapProductToDetails({
      ...baseRow(),
      variants: [
        variant({ taille: "XL", matiere: "Coton" }),
        variant(["XL"]),
        variant("XL"),
        variant(null),
      ],
    });

    // Ordre de tri par SKU : les quatre variantes partagent le même SKU, l'ordre source est conservé.
    expect(details.variants[0].attributes).toEqual({ taille: "XL", matiere: "Coton" });
    // JsonArray / scalaire / null ne sont pas des dictionnaires d'attributs exploitables.
    expect(details.variants[1].attributes).toBeNull();
    expect(details.variants[2].attributes).toBeNull();
    expect(details.variants[3].attributes).toBeNull();
    expect(details.variants[0].stock[0].available).toBe(3);
  });

  it("falls back on real inventory when the availability projection is unloaded", () => {
    expect(mapProductToDetails({ ...baseRow(), stock: { quantity: 2, reserved: 0 } }).availability).toBe(true);
    expect(mapProductToDetails({ ...baseRow(), stock: { quantity: 2, reserved: 2 } }).availability).toBe(false);
    // La projection reste prioritaire quand elle est chargée.
    expect(mapProductToDetails({
      ...baseRow(), stock: { quantity: 9, reserved: 0 }, availabilityProjection: { isAvailable: false },
    }).availability).toBe(false);
  });
});


