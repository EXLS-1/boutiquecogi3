"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { WishlistItem } from "@/store/use-wishlist";

export async function syncWishlistAction(localItems: WishlistItem[]) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return { success: false, error: "Non authentifié" };

    const userId = session.user.id;

    // 1. Récupérer la wishlist actuelle de la BDD
    const userWishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: { items: true },
    });

    // 2. Logique de fusion (Merging)
    // Pour chaque item local, on l'ajoute s'il n'existe pas en BDD
    for (const item of localItems) {
      await prisma.wishlistItem.upsert({
        where: {
          wishlistId_productId: {
            wishlistId: userWishlist?.id || "",
            productId: item.id,
          },
        },
        update: {}, // Ne rien faire si existe déjà
        create: {
          wishlist: {
            connectOrCreate: { where: { userId }, create: { userId } },
          },
          product: { connect: { id: item.id } },
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Wishlist Sync Error:", error);
    return { success: false, error: "Erreur lors de la synchronisation" };
  }
}
