// lib/cart/cart-domain.test.ts
/**
 * Tests de la source de vérité unique du panier (`lib/cart/cart-domain.ts`).
 *
 * Le module est PUR : ces tests valident donc directement le contrat partagé
 * par le store Zustand, la page panier, le tunnel de paiement, la
 * synchronisation serveur et les écrans de commandes :
 *  - bornage des quantités et des montants (aucun `NaN` ne doit sortir) ;
 *  - résolution du prix selon la devise (remise appliquée, arrondi devise) ;
 *  - normalisation du panier (déduplication, indisponibilité, rupture de stock) ;
 *  - signature de synchronisation (déduplication réseau) ;
 *  - charge utile `syncCartAction` (contrat Zod serveur respecté).
 */

import { describe, expect, it } from "vitest";

import {
  CART_ROUTES,
  MAX_CART_QUANTITY,
  buildCartSummary,
  buildCartSyncPayload,
  buildSignInRedirect,
  cartItemsSignature,
  clampCartQuantity,
  formatCartAmount,
  formatCartBadgeLabel,
  formatCartItemCount,
  resolveAvailableStock,
  resolveCartCurrency,
  resolveCartStock,
  resolveCartUnitPrice,
  sumCartItemsTotal,
  sumCartLinesQuantity,
  sumCartLinesTotal,
  toCartLines,
  type CartLineInput,
  type CartProductInput,
} from "./cart-domain";

/** Produit de panier minimal, surchargeable par test. */
function makeProduct(
  overrides: Partial<CartProductInput> = {},
): CartProductInput {
  return {
    id: "product-1",
    name: "Robe en soie",
    image: "https://cdn.example.com/robe.webp",
    price: 25,
    basePriceUSD: 25,
    basePriceCDF: 70_000,
    discountPercent: 0,
    isAvailable: true,
    ...overrides,
  };
}

/** Ligne de panier minimale. */
function makeLine(product: CartProductInput, quantity: number): CartLineInput {
  return { product, quantity };
}

describe("clampCartQuantity", () => {
  it("renvoie 0 pour toute quantité inexploitable", () => {
    expect(clampCartQuantity(undefined)).toBe(0);
    expect(clampCartQuantity(null)).toBe(0);
    expect(clampCartQuantity(Number.NaN)).toBe(0);
    expect(clampCartQuantity(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampCartQuantity("3")).toBe(0);
    expect(clampCartQuantity(0)).toBe(0);
    expect(clampCartQuantity(-4)).toBe(0);
  });

  it("tronque les décimales et borne la quantité maximale", () => {
    expect(clampCartQuantity(1.9)).toBe(1);
    expect(clampCartQuantity(MAX_CART_QUANTITY + 50)).toBe(MAX_CART_QUANTITY);
    expect(clampCartQuantity(150, 10)).toBe(10);
    // `max` inexploitable → bornage plancher à 1
    expect(clampCartQuantity(5, 0)).toBe(1);
  });
});

describe("stock", () => {
  it("calcule la quantité disponible = quantity - reserved", () => {
    expect(resolveAvailableStock({ quantity: 10, reserved: 3 })).toBe(7);
    expect(resolveAvailableStock({ quantity: 2, reserved: 5 })).toBe(0);
    expect(resolveAvailableStock(null)).toBe(0);
    expect(resolveAvailableStock({ quantity: undefined, reserved: 4 })).toBe(0);
  });

  it("distingue stock non renseigné (null) et rupture (0)", () => {
    expect(resolveCartStock(makeProduct())).toBeNull();
    expect(resolveCartStock(makeProduct({ stock: 0 }))).toBe(0);
    expect(resolveCartStock(makeProduct({ stock: -3 }))).toBe(0);
    expect(resolveCartStock(makeProduct({ stock: 4.8 }))).toBe(4);
  });
});

describe("resolveCartUnitPrice", () => {
  it("résout le prix par devise (USD / CDF)", () => {
    const product = makeProduct();
    expect(resolveCartUnitPrice(product, "USD")).toBe(25);
    expect(resolveCartUnitPrice(product, "CDF")).toBe(70_000);
  });

  it("retombe sur `price` quand le prix devise est absent", () => {
    const product = makeProduct({ basePriceUSD: 0, basePriceCDF: null });
    expect(resolveCartUnitPrice(product, "USD")).toBe(25);
    expect(resolveCartUnitPrice(product, "CDF")).toBe(25);
  });

  it("applique et borne la remise", () => {
    expect(resolveCartUnitPrice(makeProduct({ discountPercent: 10 }), "USD")).toBe(
      22.5,
    );
    expect(
      resolveCartUnitPrice(makeProduct({ discountPercent: 150 }), "USD"),
    ).toBe(0);
    expect(
      resolveCartUnitPrice(makeProduct({ discountPercent: -20 }), "USD"),
    ).toBe(25);
  });

  it("arrondit selon la devise", () => {
    // 33 % de 70 000 CDF = 46 900 CDF (devise sans centimes)
    expect(
      resolveCartUnitPrice(makeProduct({ discountPercent: 33 }), "CDF"),
    ).toBe(46_900);
    // 33 % de 25 USD = 16,75 USD
    expect(
      resolveCartUnitPrice(makeProduct({ discountPercent: 33 }), "USD"),
    ).toBe(16.75);
  });

  it("renvoie 0 (ligne à écarter) quand le prix est inexploitable", () => {
    const noPrice = { basePriceUSD: null, basePriceCDF: null } as const;

    expect(resolveCartUnitPrice(null, "USD")).toBe(0);
    expect(
      resolveCartUnitPrice(makeProduct({ ...noPrice, price: Number.NaN }), "USD"),
    ).toBe(0);
    expect(
      resolveCartUnitPrice(makeProduct({ ...noPrice, price: 0 }), "USD"),
    ).toBe(0);
    expect(
      resolveCartUnitPrice(makeProduct({ ...noPrice, price: -5 }), "USD"),
    ).toBe(0);
    expect(
      resolveCartUnitPrice(makeProduct({ ...noPrice, price: undefined }), "USD"),
    ).toBe(0);
  });
});

describe("buildCartSummary", () => {
  it("normalise des lignes valides et calcule le total exact", () => {
    const summary = buildCartSummary(
      [
        makeLine(
          makeProduct({ id: "a", name: "A", price: 10, basePriceUSD: 10 }),
          2,
        ),
        makeLine(
          makeProduct({ id: "b", name: "B", price: 5.5, basePriceUSD: 5.5 }),
          3,
        ),
      ],
      "USD",
    );

    expect(summary.lines).toEqual([
      {
        id: "a",
        name: "A",
        image: "https://cdn.example.com/robe.webp",
        price: 10,
        quantity: 2,
      },
      {
        id: "b",
        name: "B",
        image: "https://cdn.example.com/robe.webp",
        price: 5.5,
        quantity: 3,
      },
    ]);
    expect(summary.total).toBe(36.5);
    expect(summary.totalQuantity).toBe(5);
    expect(summary.issues).toEqual([]);
    expect(summary.isPayable).toBe(true);
  });

  it("déduplique deux entrées du même produit (localStorage corrompu)", () => {
    const summary = buildCartSummary(
      [
        makeLine(makeProduct({ stock: 5 }), 3),
        makeLine(makeProduct({ stock: 5 }), 4),
      ],
      "USD",
    );

    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0].quantity).toBe(5);
    expect(summary.totalQuantity).toBe(5);
  });

  it("écarte indisponible, rupture, prix nul, produit absent et quantité invalide", () => {
    const summary = buildCartSummary(
      [
        makeLine(makeProduct({ id: "off", isAvailable: false }), 1),
        makeLine(makeProduct({ id: "nostock", stock: 0 }), 1),
        makeLine(makeProduct({ id: "noprice", price: null, basePriceUSD: null, basePriceCDF: null }), 1),
        { product: null, quantity: 2 },
        makeLine(makeProduct({ id: "nan-qty" }), Number.NaN),
      ],
      "USD",
    );

    expect(summary.lines).toEqual([]);
    expect(summary.total).toBe(0);
    expect(summary.isPayable).toBe(false);
    expect(summary.issues.map((issue) => issue.reason)).toEqual([
      "unavailable",
      "out_of_stock",
      "price",
      "invalid",
      "quantity",
    ]);
    expect(summary.issues[0].name).toBe("Robe en soie");
    expect(summary.issues[3].name).toBe("Article inconnu");
  });

  it("borne la quantité au stock disponible et le signale", () => {
    const summary = buildCartSummary(
      [makeLine(makeProduct({ stock: 2 }), 9)],
      "USD",
    );

    expect(summary.lines[0].quantity).toBe(2);
    expect(summary.issues).toEqual([
      { id: "product-1", name: "Robe en soie", reason: "quantity" },
    ]);
  });

  it("utilise l'image de repli et un nom par défaut", () => {
    const summary = buildCartSummary(
      [makeLine(makeProduct({ name: null, image: "" }), 1)],
      "USD",
    );

    expect(summary.lines[0].name).toBe("Article sans nom");
    expect(summary.lines[0].image).toBe("/placeholder.webp");
  });

  it("tolère une liste nulle et reste en USD par défaut", () => {
    const summary = buildCartSummary(null);

    expect(summary.lines).toEqual([]);
    expect(summary.total).toBe(0);
    expect(summary.currency).toBe("USD");
    expect(summary.isPayable).toBe(false);
  });

  it("reste cohérent sur une devise inconnue", () => {
    const summary = buildCartSummary(
      [makeLine(makeProduct({ price: 10, basePriceUSD: 10 }), 1)],
      "eur" as unknown as "USD",
    );

    expect(summary.currency).toBe("USD");
    expect(summary.total).toBe(10);
  });
});

describe("totaux dérivés", () => {
  const items: CartLineInput[] = [
    makeLine(makeProduct({ id: "a", price: 10, basePriceUSD: 10 }), 2),
    makeLine(makeProduct({ id: "b", price: 5, basePriceUSD: 5 }), 1),
  ];

  it("toCartLines / sumCartLinesTotal / sumCartLinesQuantity concordent", () => {
    const lines = toCartLines(items, "USD");

    expect(sumCartLinesTotal(lines, "USD")).toBe(25);
    expect(sumCartLinesQuantity(lines)).toBe(3);
    expect(sumCartItemsTotal(items, "USD")).toBe(25);
  });

  it("distingue total estimé (brut) et total payable (normalisé)", () => {
    const withUnavailable: CartLineInput[] = [
      ...items,
      makeLine(makeProduct({ id: "off", isAvailable: false, price: 100 }), 1),
    ];

    // Estimation brute (store → navbar) : toutes les lignes comptées
    expect(sumCartItemsTotal(withUnavailable, "USD")).toBe(125);
    // Montant payable (checkout → CinetPay) : articles indisponibles écartés
    expect(sumCartLinesTotal(toCartLines(withUnavailable, "USD"), "USD")).toBe(25);
  });
});

describe("cartItemsSignature", () => {
  it("est indépendante de l'ordre et du prix, sensible à la quantité", () => {
    const a = cartItemsSignature([
      makeLine(makeProduct({ id: "a", price: 10 }), 1),
      makeLine(makeProduct({ id: "b", price: 10 }), 2),
    ]);
    const reordered = cartItemsSignature([
      makeLine(makeProduct({ id: "b", price: 99 }), 2),
      makeLine(makeProduct({ id: "a", price: 10 }), 1),
    ]);
    const changedQuantity = cartItemsSignature([
      makeLine(makeProduct({ id: "a", price: 10 }), 3),
      makeLine(makeProduct({ id: "b", price: 10 }), 2),
    ]);

    expect(a).toBe("a:1|b:2");
    expect(a).toBe(reordered);
    expect(a).not.toBe(changedQuantity);
  });

  it("ignore les entrées corrompues (pas de synchronisation parasite)", () => {
    expect(cartItemsSignature(null)).toBe("");
    expect(
      cartItemsSignature([
        { product: null, quantity: 1 },
        makeLine(makeProduct({ id: "a" }), 0),
      ]),
    ).toBe("");
  });
});

describe("buildCartSyncPayload", () => {
  it("produit le contrat attendu par `syncCartAction`, dédupliqué et trié", () => {
    const payload = buildCartSyncPayload([
      makeLine(makeProduct({ id: "b", name: "B", price: 5 }), 1),
      makeLine(makeProduct({ id: "a", name: "A", price: 10 }), 2),
      makeLine(makeProduct({ id: "a", name: "A", price: 10 }), 1),
    ]);

    expect(payload).toEqual([
      {
        id: "a",
        name: "A",
        image: "https://cdn.example.com/robe.webp",
        price: 10,
        quantity: 3,
      },
      {
        id: "b",
        name: "B",
        image: "https://cdn.example.com/robe.webp",
        price: 5,
        quantity: 1,
      },
    ]);
  });

  it("envoie le prix catalogue (remise non appliquée) et écarte l'inexploitable", () => {
    const payload = buildCartSyncPayload([
      makeLine(makeProduct({ id: "promo", price: 100, discountPercent: 50 }), 1),
      { product: null, quantity: 1 },
      makeLine(makeProduct({ id: "noprice", price: null, basePriceUSD: null }), 1),
      makeLine(makeProduct({ id: "zero", price: 10 }), 0),
    ]);

    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({ id: "promo", price: 100, quantity: 1 });
  });

  it("respecte le schéma serveur : image et nom jamais vides", () => {
    const payload = buildCartSyncPayload([
      makeLine(makeProduct({ name: "", image: "" }), 1),
    ]);

    expect(payload[0].name).toBe("Article sans nom");
    expect(payload[0].image).toBe("/placeholder.webp");
  });
});

describe("formatage & libellés", () => {
  it("formate les montants selon la devise", () => {
    expect(formatCartAmount(1234.5, "USD")).toContain("1");
    expect(formatCartAmount(1234.5, "USD")).toBe(
      formatCartAmount(1234.5, "USD"),
    );
    // Arrondi CDF : aucune décimale
    expect(formatCartAmount(46_900.4, "CDF")).not.toContain(",");
    expect(formatCartAmount(Number.NaN, "USD")).toBe(
      formatCartAmount(0, "USD"),
    );
  });

  it("pluralise les libellés d'articles", () => {
    expect(formatCartItemCount(0)).toBe("0 article");
    expect(formatCartItemCount(1)).toBe("1 article");
    expect(formatCartItemCount(3)).toBe("3 articles");
    expect(formatCartBadgeLabel(2)).toBe("2 articles dans le panier");
  });

  it("normalise la devise et construit la redirection de connexion", () => {
    expect(resolveCartCurrency("cdf")).toBe("CDF");
    expect(resolveCartCurrency(undefined)).toBe("USD");
    expect(buildSignInRedirect(CART_ROUTES.checkout)).toBe(
      "/auth/sign-in?callbackUrl=%2Fcheckout",
    );
    expect(buildSignInRedirect("checkout")).toContain("%2Fcheckout");
  });
});

