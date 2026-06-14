// lib/actions/wishlist.actions.ts
// This file defines a server action called `syncWishlistAction` that synchronizes the user's local wishlist with the wishlist stored in the database. It retrieves the current user's session, checks for authentication, and then performs a merging logic to ensure that all items from the local wishlist are added to the database without creating duplicates. The action uses Prisma to interact with the database and returns a success or error response based on the outcome of the synchronization process. This action is intended to be called from the client side when a user logs in or when there are changes to the local wishlist that need to be reflected in the database.
// This server action is designed to be used in conjunction with the `WishlistSyncManager` component, which triggers the synchronization process when the user session changes or when there are updates to the local wishlist. The merging logic ensures that the user's wishlist remains consistent across different sessions and devices, providing a seamless experience for users who want to maintain their favorites list.
// Ce fichier définit une action serveur appelée `syncWishlistAction` qui synchronise la liste de favoris locale de l'utilisateur
// avec celle stockée dans la base de données. Il récupère la session actuelle de l'utilisateur,
// vérifie l'authentification, puis effectue une logique de fusion pour s'assurer que
// tous les éléments de la liste de favoris locale sont ajoutés à la base de données sans créer de doublons.
// L'action utilise Prisma pour interagir avec la base de données et
// retourne une réponse de succès ou d'erreur en fonction du résultat du processus de synchronisation.
// Cette action est destinée à être appelée depuis le côté client lorsque l'utilisateur se connecte ou
// lorsqu'il y a des changements dans la liste de souhaits locale qui doivent être reflétés dans la base de données.
// Cette action serveur est conçue pour être utilisée en conjonction avec le composant `WishlistSyncManager`,
// qui déclenche le processus de synchronisation lorsque la session utilisateur change ou
// lorsqu'il y a des mises à jour dans la liste de favoris locale.
// La logique de fusion garantit que la liste de favoris de l'utilisateur reste cohérente sur différentes sessions et
// appareils, offrant une expérience transparente pour les utilisateurs qui souhaitent maintenir leur liste de favoris.

"use server";

import { generateUUIDv7 } from "@/lib/uuid";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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
    let userWishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!userWishlist) {
      userWishlist = await prisma.wishlist.create({
        data: {
          id: generateUUIDv7(),
          userId,
        },
        include: { items: true },
      });
    }

    if (!userWishlist) {
      return {
        success: false,
        error: "Erreur lors de la récupération de la wishlist",
      };
    }

    // 2. Logique de fusion (Merging)
    // Pour chaque item local, on l'ajoute s'il n'existe pas en BDD
    for (const item of localItems) {
      await prisma.wishlistItem.upsert({
        where: {
          wishlistId_productId: {
            wishlistId: userWishlist.id,
            productId: item.id,
          },
        },
        update: {}, // Ne rien faire si existe déjà
        create: {
          id: generateUUIDv7(), // Utilise generateUUIDv7 pour générer un nouvel ID
          wishlist: {
            connect: { id: userWishlist.id },
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
