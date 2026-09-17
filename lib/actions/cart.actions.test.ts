/**
 * Tests de `resolveCartProductsAction` — résolution des produits du panier.
 *
 * Vérifie le contrat exposé à l'UI :
 *  - validation stricte des identifiants (type, vide, bornage, trim) ;
 *  - résolution par `id` OU `slug`, avec remontée des identifiants introuvables ;
 *  - erreur exploitable (jamais de throw) si le catalogue échoue.
 *
 * Les dépendances serveur lourdes (Prisma, Better-Auth, `next/headers`,
 * requêtes catalogue) sont mockées : le test porte sur la logique de l'action.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogProduct } from "@/lib/product-catalog/catalog-types";

const { getCatalogProductsByIds } = vi.hoisted(() => ({
  getCatalogProductsByIds: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/lib/product-catalog/catalog-queries", () => ({
  getCatalogProductsByIds,
}));

import { resolveCartProductsAction } from "./cart.actions";

/** Produit minimal : seules les clés utilisées par l'action nous intéressent. */
function makeProduct(id: string, slug: string): CatalogProduct {
  return { id, slug, isAvailable: true } as unknown as CatalogProduct;
}

const TSHIRT = makeProduct("0192f0a6-0000-7000-8000-000000000001", "t-shirt");
const MUG = makeProduct("0192f0a6-0000-7000-8000-000000000002", "mug");

describe("resolveCartProductsAction", () => {
  beforeEach(() => {
    getCatalogProductsByIds.mockReset();
  });

  it("refuse une entrée qui n'est pas un tableau d'identifiants", async () => {
    const result = await resolveCartProductsAction("t-shirt");

    expect(result).toEqual({
      success: false,
      error: "Identifiants produits invalides",
    });
    expect(getCatalogProductsByIds).not.toHaveBeenCalled();
  });

  it("refuse une liste vide (aucun produit à ajouter)", async () => {
    const result = await resolveCartProductsAction([]);

    expect(result.success).toBe(false);
    expect(getCatalogProductsByIds).not.toHaveBeenCalled();
  });

  it("résout par id et par slug, et remonte les identifiants introuvables", async () => {
    getCatalogProductsByIds.mockResolvedValue([TSHIRT, MUG]);

    const result = await resolveCartProductsAction([
      " 0192f0a6-0000-7000-8000-000000000001 ",
      "mug",
      "produit-supprime",
    ]);

    // Les identifiants sont normalisés (trim) avant la requête catalogue
    expect(getCatalogProductsByIds).toHaveBeenCalledWith([
      "0192f0a6-0000-7000-8000-000000000001",
      "mug",
      "produit-supprime",
    ]);

    expect(result).toEqual({
      success: true,
      products: [TSHIRT, MUG],
      missingIds: ["produit-supprime"],
    });
  });

  it("renvoie un résultat vide sans erreur quand rien n'est résolu", async () => {
    getCatalogProductsByIds.mockResolvedValue([]);

    const result = await resolveCartProductsAction(["fantome"]);

    expect(result).toEqual({
      success: true,
      products: [],
      missingIds: ["fantome"],
    });
  });

  it("transforme une panne catalogue en erreur exploitable par l'UI", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getCatalogProductsByIds.mockRejectedValue(new Error("DB down"));

    const result = await resolveCartProductsAction(["t-shirt"]);

    expect(result).toEqual({
      success: false,
      error: "Impossible de charger les produits depuis le catalogue",
    });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
