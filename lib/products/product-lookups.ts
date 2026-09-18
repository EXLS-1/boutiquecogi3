// lib/products/product-lookups.ts
// =============================================================================
// PRODUCT LOOKUPS — lectures partagées (aucune dépendance sur les erreurs)
// =============================================================================
// Module volontairement sans dépendance interne : il est consommé à la fois
// par `product.service.ts` (surface `ProductService`) et par
// `product-service-helpers.ts`. Cela évite un import circulaire
// service ⇄ helpers tout en gardant UNE seule définition des includes.

import { prisma } from "@/lib/prisma";

/** Produit complet + toutes ses relations d'affichage (usage: pages & actions). */
export function findProductById(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: { include: { variantStocks: true } },
      productPrices: true,
      productImages: { orderBy: { position: "asc" as const } },
      statusHistory: { orderBy: { changedAt: "desc" as const } },
      categoryProducts: { include: { category: true } },
      catalogs: { include: { catalog: true } },
      productTags: { include: { tag: true } },
    },
  });
}

/** Variante + son stock + son produit parent (le `productId` est donc disponible). */
export function findVariantById(variantId: string) {
  return prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { variantStocks: true, product: true },
  });
}

/** Prix produit + l'identifiant du produit porteur (contrôle d'appartenance). */
export function findPriceById(priceId: string) {
  return prisma.productPrice.findUnique({
    where: { id: priceId },
    include: { product: { select: { id: true } } },
  });
}
