// lib/actions/cart.actions.ts

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Instance Better-Auth serveur
import { headers } from "next/headers";
import { z } from "zod";

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
