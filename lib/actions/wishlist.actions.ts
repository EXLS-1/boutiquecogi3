// lib/actions/wishlist.actions.ts
// Actions sécurisées pour la gestion de la liste de souhaits (wishlist)
// Règle d'or : aucun utilisateur ne peut voir ni modifier la wishlist d'un autre utilisateur sauf permission RBAC.

"use server";

import { z } from "zod";
import { resolveAuthContext, assertAccessUserData } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

const PERSONAL_WISHLIST_FEATURE = "PERSONAL_WISHLIST";
const DEFAULT_MAX_ITEMS = 50;
const productIdSchema = z.string().uuid("Identifiant produit invalide");
const productIdsSchema = z.array(productIdSchema).max(DEFAULT_MAX_ITEMS);

export type WishlistProduct = {
  id: string;
  name: string;
  price: number;
  productPrice?: number;
  image: string;
  slug: string;
  category?: string;
};

async function getConfig() {
  return prisma.wishlistConfig.findUnique({
    where: { feature: PERSONAL_WISHLIST_FEATURE },
    select: { maxItems: true },
  });
}

async function getOrCreateWishlist(userId: string) {
  return prisma.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  });
}

async function readItems(userId: string): Promise<WishlistProduct[]> {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    select: {
      items: {
        orderBy: { addedAt: "desc" },
        select: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              productPrice: true,
              images: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const toPriceNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === "object" && value !== null && "toNumber" in value) {
      try {
        const n = (value as { toNumber: () => unknown }).toNumber();
        return typeof n === "number" && Number.isFinite(n) ? n : 0;
      } catch {
        return 0;
      }
    }
    return 0;
  };

  return (wishlist?.items ?? []).map(({ product }) => {
    const images = Array.isArray(product.images) ? product.images : [];
    const firstImage = images.length > 0 && typeof images[0] === "string" ? images[0] : "/placeholder.webp";
    const price = toPriceNumber(product.productPrice);
    return {
      id: product.id,
      name: product.name,
      price,
      productPrice: price,
      image: firstImage,
      slug: product.slug,
      category: product.category?.name,
    };
  });
}

/**
 * Récupère la liste de souhaits d'un utilisateur.
 * ISOLATION STRICTE : Un client ne peut consulter que sa propre liste de souhaits.
 * La consultation de la liste d'un autre utilisateur est interdite sauf privilèges RBAC (Modérateur Level <= 4 ou 'users:read').
 */
export async function getWishlistAction(targetUserId?: string) {
  const authContext = await resolveAuthContext();
  if (!authContext?.user) {
    return { success: false as const, error: "Non authentifié" };
  }

  const targetId = targetUserId || authContext.user.id;

  try {
    assertAccessUserData(authContext, targetId, ["users:read", "users:view:any"], {
      minRoleLevel: 4, // Level 1 (Super-Admin), Level 2 (Admin), Level 3 (Manager), Level 4 (Moderator/Editor)
      action: "wishlist:read",
      resource: "wishlist",
      resourceId: targetId,
    });
  } catch {
    return {
      success: false as const,
      error: "Accès refusé : vous n'êtes pas autorisé à consulter la liste de favoris d'un autre utilisateur.",
    };
  }

  return { success: true as const, items: await readItems(targetId) };
}

/** 
 * Synchronise les sélections locales avec la base de données.
 * ISOLATION GARANTIE : L'opération est strictement liée à l'utilisateur authentifié (authContext.user.id).
 */
export async function syncWishlistAction(localItems: readonly { id: string }[]) {
  const validation = productIdsSchema.safeParse([...new Set(localItems.map((item) => item.id))]);
  if (!validation.success) return { success: false as const, error: "Favoris invalides" };

  const authContext = await resolveAuthContext();
  if (!authContext?.user) return { success: false as const, error: "Non authentifié" };

  const userId = authContext.user.id;

  try {
    const [config, wishlist] = await Promise.all([getConfig(), getOrCreateWishlist(userId)]);
    const existing = await prisma.wishlistItem.findMany({
      where: { wishlistId: wishlist.id }, select: { productId: true },
    });
    const existingIds = new Set(existing.map((item) => item.productId));
    const candidates = validation.data.filter((id) => !existingIds.has(id));
    const products = await prisma.product.findMany({
      where: { id: { in: candidates } }, select: { id: true },
    });
    const slots = Math.max(0, (config?.maxItems ?? DEFAULT_MAX_ITEMS) - existing.length);
    const productIds = products.slice(0, slots).map((product) => product.id);
    if (productIds.length) {
      await prisma.wishlistItem.createMany({
        data: productIds.map((productId) => ({ wishlistId: wishlist.id, productId })),
        skipDuplicates: true,
      });
    }
    return { success: true as const, items: await readItems(userId) };
  } catch (error) {
    console.error("Wishlist sync error:", error);
    return { success: false as const, error: "Erreur lors de la synchronisation des favoris" };
  }
}

/**
 * Ajoute un article aux favoris du compte connecté.
 */
export async function addWishlistItemAction(productId: unknown) {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return { success: false as const, error: "Identifiant produit invalide" };

  const authContext = await resolveAuthContext();
  if (!authContext?.user) return { success: false as const, error: "Non authentifié" };

  const userId = authContext.user.id;

  try {
    const [config, product, wishlist] = await Promise.all([
      getConfig(),
      prisma.product.findUnique({ where: { id: parsed.data }, select: { id: true } }),
      getOrCreateWishlist(userId),
    ]);
    if (!product) return { success: false as const, error: "Produit introuvable" };
    const alreadySaved = await prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: parsed.data } },
      select: { id: true },
    });
    if (!alreadySaved) {
      const maxItems = config?.maxItems ?? DEFAULT_MAX_ITEMS;
      const count = await prisma.wishlistItem.count({ where: { wishlistId: wishlist.id } });
      if (count >= maxItems) return { success: false as const, error: `Votre liste est limitée à ${maxItems} articles` };
      await prisma.wishlistItem.create({ data: { wishlistId: wishlist.id, productId: parsed.data } });
    }
    return { success: true as const, items: await readItems(userId) };
  } catch (error) {
    console.error("Wishlist add error:", error);
    return { success: false as const, error: "Impossible d'ajouter ce favori" };
  }
}

/**
 * Supprime un article des favoris du compte connecté.
 */
export async function removeWishlistItemAction(productId: unknown) {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return { success: false as const, error: "Identifiant produit invalide" };

  const authContext = await resolveAuthContext();
  if (!authContext?.user) return { success: false as const, error: "Non authentifié" };

  const userId = authContext.user.id;

  await prisma.wishlistItem.deleteMany({ where: { wishlist: { userId }, productId: parsed.data } });
  return { success: true as const, items: await readItems(userId) };
}

/**
 * Vide intégralement la liste de favoris du compte connecté.
 */
export async function clearWishlistAction() {
  const authContext = await resolveAuthContext();
  if (!authContext?.user) return { success: false as const, error: "Non authentifié" };

  const userId = authContext.user.id;

  await prisma.wishlistItem.deleteMany({ where: { wishlist: { userId } } });
  return { success: true as const, items: [] as WishlistProduct[] };
}
