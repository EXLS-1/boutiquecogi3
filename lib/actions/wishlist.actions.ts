"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const PERSONAL_WISHLIST_FEATURE = "PERSONAL_WISHLIST";
const DEFAULT_MAX_ITEMS = 50;
const productIdSchema = z.string().uuid("Identifiant produit invalide");
const productIdsSchema = z.array(productIdSchema).max(DEFAULT_MAX_ITEMS);

export type WishlistProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  category?: string;
};

async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

async function getConfig() {
  return prisma.wishlistConfig.findUnique({
    where: { feature: PERSONAL_WISHLIST_FEATURE },
    select: { maxItems: true },
  });
}

async function getOrCreateWishlist(userId: string) {
  return prisma.wishlist.upsert({
    where: { userId }, update: {}, create: { userId }, select: { id: true },
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
              price: true,
              images: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  return (wishlist?.items ?? []).map(({ product }) => ({
    id: product.id,
    name: product.name,
    price: product.price?.toNumber() ?? 0,
    image: product.images[0] ?? "/placeholder.webp",
    slug: product.slug,
    category: product.category?.name,
  }));
}

export async function getWishlistAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const, error: "Non authentifié" };
  return { success: true as const, items: await readItems(userId) };
}

/** Merges guest selections once signed in; Prisma remains the source of truth. */
export async function syncWishlistAction(localItems: readonly { id: string }[]) {
  const validation = productIdsSchema.safeParse([...new Set(localItems.map((item) => item.id))]);
  if (!validation.success) return { success: false as const, error: "Favoris invalides" };
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const, error: "Non authentifié" };

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

export async function addWishlistItemAction(productId: unknown) {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return { success: false as const, error: "Identifiant produit invalide" };
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const, error: "Non authentifié" };
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

export async function removeWishlistItemAction(productId: unknown) {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return { success: false as const, error: "Identifiant produit invalide" };
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const, error: "Non authentifié" };
  await prisma.wishlistItem.deleteMany({ where: { wishlist: { userId }, productId: parsed.data } });
  return { success: true as const, items: await readItems(userId) };
}

export async function clearWishlistAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false as const, error: "Non authentifié" };
  await prisma.wishlistItem.deleteMany({ where: { wishlist: { userId } } });
  return { success: true as const, items: [] as WishlistProduct[] };
}
