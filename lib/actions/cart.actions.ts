// lib/actions/cart.actions.ts

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Instance Better-Auth serveur
import { headers } from "next/headers";
import { z } from "zod";
import { getCatalogProductsByIds } from "@/lib/product-catalog/catalog-queries";
import type { CatalogProduct } from "@/lib/product-catalog/catalog-types";

/**
 * Schéma de validation aligné sur l'interface CartItem de Zustand.
 */
const CartItemSchema = z.object({
  id: z.string().min(1, "ID requis"),
  name: z.string().min(1),
  image: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive("La quantité doit être supérieure à 0"),
});

const SyncCartSchema = z.array(CartItemSchema);

/**
 * Identifiants produits acceptés pour la résolution panier.
 * Bornés : un panier ne peut pas dépasser `MAX_CART_RESOLUTION_SIZE` articles
 * distincts par appel, ce qui évite les requêtes `IN (...)` non maîtrisées.
 */
const MAX_CART_RESOLUTION_SIZE = 50;

const CartProductIdsSchema = z
  .array(z.string().trim().min(1, "Identifiant produit requis"))
  .min(1, "Au moins un identifiant produit est requis")
  .max(
    MAX_CART_RESOLUTION_SIZE,
    `Trop d'identifiants produits (${MAX_CART_RESOLUTION_SIZE} maximum)`,
  );

/**
 * Résultat de `resolveCartProductsAction` :
 * soit des produits complets + la liste des identifiants non résolus,
 * soit une erreur exploitable par l'UI.
 */
export type ResolveCartProductsResult =
  | {
      readonly success: true;
      readonly products: readonly CatalogProduct[];
      /** Identifiants fournis ne correspondant à aucun produit publié. */
      readonly missingIds: readonly string[];
    }
  | { readonly success: false; readonly error: string };

/**
 * Résout une liste d'identifiants produits (`id` OU `slug`) en `CatalogProduct`
 * complets, prêts à être ajoutés au panier Zustand.
 *
 * Pourquoi cette action : le store panier (`store/use-cart.ts`) exige un
 * `CatalogProduct` complet (`isAvailable`, `price`, `basePriceCDF/USD`,
 * `discountPercent`, `accessPolicy`…). Les stores clients légers (wishlist,
 * récemment vus) ne conservent qu'un sous-ensemble de champs : reconstruire un
 * objet partiel faisait échouer le typage ET l'ajout au panier (`addItem` sort
 * immédiatement si `isAvailable` est absent). La résolution se fait donc
 * côté serveur, via la source de vérité du catalogue.
 */
export async function resolveCartProductsAction(
  ids: unknown,
): Promise<ResolveCartProductsResult> {
  const validation = CartProductIdsSchema.safeParse(ids);

  if (!validation.success) {
    return { success: false, error: "Identifiants produits invalides" };
  }

  const requestedIds = validation.data;

  try {
    const products = await getCatalogProductsByIds(requestedIds);

    // Un identifiant est résolu s'il correspond à un `id` ou un `slug` renvoyé.
    const resolvedKeys = new Set(
      products.flatMap((product) => [product.id, product.slug]),
    );
    const missingIds = requestedIds.filter((id) => !resolvedKeys.has(id));

    return { success: true, products, missingIds };
  } catch (error) {
    console.error("Resolve cart products error:", error);
    return {
      success: false,
      error: "Impossible de charger les produits depuis le catalogue",
    };
  }
}

/**
 * Synchronise le panier local avec la base de données.
 * Utilise une transaction Prisma pour garantir l'atomicité.
 */
export async function syncCartAction(localItems: unknown) {
  // 1. Validation des données entrantes
  const validation = SyncCartSchema.safeParse(localItems);
  if (!validation.success) {
    return {
      success: false,
      error: "Données du panier invalides",
      details: validation.error.format(),
    };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Non authentifié" };
  }

  const userId = session.user.id;
  const validatedItems = validation.data;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Récupérer ou créer le panier pour l'utilisateur
      let cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!cart) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        cart = await tx.cart.create({
          data: { userId, expiresAt },
          include: { items: true },
        });
      }

      if (!cart) throw new Error('Failed to create cart');

      // 2. Logique de fusion (Merging)
      // Ici, nous privilégions les quantités locales pour la simplicité,
      // mais vous pouvez implémenter une logique d'addition de quantités.
      for (const item of validatedItems) {
        await tx.cartItem.upsert({
          where: {
            cartId_variantId: {
              cartId: cart.id,
              variantId: item.id,
            },
          },
          update: { quantity: item.quantity },
          create: {
            cartId: cart.id,
            variantId: item.id,
            quantity: item.quantity,
          },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Cart sync error:", error);
    return { success: false, error: "Erreur lors de la synchronisation" };
  }
}
