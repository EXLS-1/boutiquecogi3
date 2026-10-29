// lib/actions/cart.actions.ts
// Actions sécurisées pour la gestion du panier avec isolation stricte des utilisateurs
// Règle d'or : aucun utilisateur ne peut voir ni modifier le panier d'un autre utilisateur sauf permission RBAC.

"use server";

import { prisma } from "@/lib/prisma";
import { resolveAuthContext, assertAccessUserData } from "@/lib/auth/server";
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
 * Récupère le panier d'un utilisateur en base de données.
 * ISOLATION STRICTE : Un client ne peut consulter que son propre panier.
 * La consultation du panier d'un autre utilisateur est interdite sauf privilèges RBAC (Admin).
 */
export async function getUserCartAction(targetUserId?: string) {
  const authContext = await resolveAuthContext();
  if (!authContext?.user) {
    return { success: false, error: "Non authentifié", code: "UNAUTHENTICATED" };
  }

  const targetId = targetUserId || authContext.user.id;

  try {
    assertAccessUserData(authContext, targetId, ["users:read", "users:view:any"], {
      minRoleLevel: 2, // Admin (Level 2) ou Super-Admin (Level 1)
      action: "cart:read",
      resource: "cart",
      resourceId: targetId,
    });
  } catch {
    return {
      success: false,
      error: "Accès refusé : vous n'êtes pas autorisé à consulter le panier d'un autre utilisateur.",
      code: "FORBIDDEN",
    };
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: targetId },
      include: {
        items: true,
      },
    });

    return { success: true, data: cart };
  } catch (error) {
    console.error("[getUserCartAction]", error);
    return { success: false, error: "Impossible de récupérer le panier" };
  }
}

/**
 * Synchronise le panier local avec la base de données.
 * ISOLATION GARANTIE : L'enregistrement est strictement rattaché à l'utilisateur authentifié (session).
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

  const authContext = await resolveAuthContext();
  if (!authContext?.user) {
    return { success: false, error: "Non authentifié", code: "UNAUTHENTICATED" };
  }

  // Cloisonnement strict : le panier synchronisé est STRICTEMENT celui de l'utilisateur connecté
  const userId = authContext.user.id;
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

      if (!cart) throw new Error("Failed to create cart");

      // 2. Logique de synchronisation sécurisée
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
