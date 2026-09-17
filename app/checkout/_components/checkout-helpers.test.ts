// app/checkout/_components/checkout-helpers.test.ts
import { describe, expect, it } from "vitest";
import {
  buildCheckoutSummary,
  isValidCheckoutUser,
  normalizeMobileMoneyPhone,
  resolveCustomerName,
  resolveUnitPrice,
  resolveUserInitials,
  type CheckoutCartLineInput,
  type CheckoutProductInput,
  type CheckoutUser,
} from "./checkout-helpers";

const USER: CheckoutUser = {
  id: "user-1",
  email: "grace.kabila@cogi3.cd",
  name: "Grace Kabila",
};

const PRODUCT: CheckoutProductInput = {
  id: "p-1",
  name: "Robe wax",
  price: 25,
  basePriceUSD: 30,
  basePriceCDF: 75000,
  discountPercent: 0,
  isAvailable: true,
};

describe("isValidCheckoutUser", () => {
  it("accepte un utilisateur exploitable", () => {
    expect(isValidCheckoutUser(USER)).toBe(true);
  });

  it.each([
    null,
    undefined,
    "user",
    42,
    {},
    { id: "user-1" },
    { email: "a@b.cd" },
    { id: "   ", email: "a@b.cd" },
    { id: "user-1", email: "   " },
  ])("refuse une valeur invalide : %s", (value) => {
    expect(isValidCheckoutUser(value)).toBe(false);
  });
});

describe("identité client", () => {
  it("privilégie le nom complet", () => {
    expect(resolveCustomerName(USER)).toBe("Grace Kabila");
  });

  it("retombe sur la partie locale de l'e-mail", () => {
    expect(resolveCustomerName({ id: "u", email: "jean@cogi3.cd" })).toBe(
      "jean",
    );
    expect(resolveCustomerName({ id: "u", email: "  ", name: "  " })).toBe(
      "Client",
    );
  });

  it("génère deux initiales depuis le nom", () => {
    expect(resolveUserInitials(USER)).toBe("GK");
  });

  it("génère des initiales depuis l'e-mail", () => {
    expect(resolveUserInitials({ id: "u", email: "jean.mbala@cogi3.cd" })).toBe(
      "JM",
    );
    expect(resolveUserInitials({ id: "u", email: "  " })).toBe("?");
  });
});

describe("normalizeMobileMoneyPhone", () => {
  it.each([
    ["0812345678", "+243812345678"],
    ["081 234 567 8", "+243812345678"],
    ["+243 812 345 678", "+243812345678"],
    ["243912345678", "+243912345678"],
    ["09-123-456-78", "+243912345678"],
  ])("normalise %s", (input, expected) => {
    expect(normalizeMobileMoneyPhone(input)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "   ",
    "0712345678",
    "08123456",
    "+243112345678",
    "08123456789 abc",
    "abc",
  ])("refuse %s", (value) => {
    expect(normalizeMobileMoneyPhone(value)).toBeNull();
  });
});

describe("resolveUnitPrice", () => {
  it("utilise le prix de base USD", () => {
    expect(resolveUnitPrice(PRODUCT, "USD")).toBe(30);
  });

  it("utilise le prix de base CDF", () => {
    expect(resolveUnitPrice(PRODUCT, "CDF")).toBe(75000);
  });

  it("applique la réduction", () => {
    expect(resolveUnitPrice({ ...PRODUCT, discountPercent: 10 }, "USD")).toBeCloseTo(27);
    expect(resolveUnitPrice({ ...PRODUCT, discountPercent: 10 }, "CDF")).toBeCloseTo(67500);
  });

  it("retombe sur `price` quand le prix de base de la devise est absent", () => {
    expect(resolveUnitPrice({ id: "p-2", price: 12.5 }, "USD")).toBe(12.5);
    expect(resolveUnitPrice({ id: "p-2", price: 12.5 }, "CDF")).toBe(12.5);
  });

  it("borne une remise aberrante à 100 %", () => {
    expect(resolveUnitPrice({ id: "p-3", price: 100, discountPercent: 500 }, "USD")).toBe(0);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuse un prix invalide (%s)",
    (price) => {
      expect(resolveUnitPrice({ id: "p-4", price }, "USD")).toBe(0);
    },
  );
});

describe("buildCheckoutSummary", () => {
  it("normalise le panier vers le contrat de la Server Action", () => {
    const items: CheckoutCartLineInput[] = [
      { product: PRODUCT, quantity: 2 },
      {
        product: { id: "p-9", name: "Sac cuir", price: 10 },
        quantity: 1,
      },
    ];

    const summary = buildCheckoutSummary(items, "USD");

    expect(summary.currency).toBe("USD");
    expect(summary.issues).toHaveLength(0);
    expect(summary.lines).toEqual([
      { id: "p-1", name: "Robe wax", price: 30, quantity: 2 },
      { id: "p-9", name: "Sac cuir", price: 10, quantity: 1 },
    ]);
    expect(summary.total).toBe(70);
    expect(summary.totalQuantity).toBe(3);
  });

  it("calcule le total dans la devise demandée", () => {
    const summary = buildCheckoutSummary(
      [{ product: PRODUCT, quantity: 2 }],
      "CDF",
    );

    expect(summary.currency).toBe("CDF");
    expect(summary.lines).toEqual([
      { id: "p-1", name: "Robe wax", price: 75000, quantity: 2 },
    ]);
    expect(summary.total).toBe(150000);
  });

  it("écarte les articles indisponibles, en rupture, sans prix ou corrompus", () => {
    const items: CheckoutCartLineInput[] = [
      { product: { id: "p-1", name: "Valide", price: 10 }, quantity: 2 },
      {
        product: { id: "p-2", name: "Indisponible", price: 10, isAvailable: false },
        quantity: 1,
      },
      { product: { id: "p-3", name: "Rupture", price: 10, stock: 0 }, quantity: 1 },
      { product: { id: "p-4" }, quantity: 1 },
      { product: null, quantity: 1 },
      { quantity: 2 },
    ];

    const summary = buildCheckoutSummary(items, "USD");

    expect(summary.lines).toEqual([
      { id: "p-1", name: "Valide", price: 10, quantity: 2 },
    ]);
    expect(summary.total).toBe(20);
    expect(summary.totalQuantity).toBe(2);
    expect(summary.issues.map((issue) => issue.reason)).toEqual([
      "unavailable",
      "out_of_stock",
      "price",
      "invalid",
      "invalid",
    ]);
  });

  it("borne les quantités au stock disponible et au maximum de 99", () => {
    const items: CheckoutCartLineInput[] = [
      { product: { id: "p-1", name: "Stock 3", price: 5, stock: 3 }, quantity: 10 },
      { product: { id: "p-2", name: "Sans stock", price: 5 }, quantity: 200 },
    ];

    const summary = buildCheckoutSummary(items, "USD");

    expect(summary.lines).toEqual([
      { id: "p-1", name: "Stock 3", price: 5, quantity: 3 },
      { id: "p-2", name: "Sans stock", price: 5, quantity: 99 },
    ]);
    expect(summary.totalQuantity).toBe(102);
    expect(summary.total).toBe(510);
    expect(summary.issues.map((issue) => issue.reason)).toEqual(["quantity"]);
  });

  it("reste sûr pour un panier absent ou corrompu", () => {
    expect(buildCheckoutSummary(undefined, "USD")).toMatchObject({
      lines: [],
      issues: [],
      total: 0,
      totalQuantity: 0,
    });
    expect(buildCheckoutSummary(null, "USD").total).toBe(0);

    const summary = buildCheckoutSummary(
      [{ product: { id: "   " }, quantity: 1 }],
      "USD",
    );

    expect(summary.lines).toHaveLength(0);
    expect(summary.total).toBe(0);
    expect(summary.issues).toEqual([
      { id: "", name: "Article inconnu", reason: "invalid" },
    ]);
  });
});