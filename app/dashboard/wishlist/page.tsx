// app/dashboard/wishlist/page.tsx
// Wishlists avec RBAC
// Level 6 (Client) : sa wishlist | Level 4+ (Moderator+) : toutes

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { WishlistGrid } from "@/components/dashboard/wishlist/wishlist-grid";
import { WishlistStats } from "@/components/dashboard/wishlist/wishlist-stats";
import { Skeleton } from "@/components/ui/skeleton";

export default async function WishlistPage() {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { userId, level } = session;

  if (level > 6) redirect("/unauthorized");

  const canViewAll = level <= 4;
  const canShare = level <= 5;

  const where = canViewAll ? {} : { userId };

  const [wishlists, stats, mostWished] = await Promise.all([
    prisma.wishlist.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, price: true, images: true } } } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.wishlist.aggregate({ _count: { id: true }, where }),
    prisma.product.findMany({
      take: 10,
      orderBy: { wishlistItems: { _count: "desc" } },
      select: { id: true, name: true, price: true, images: true, _count: { select: { wishlistItems: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {canViewAll ? "Toutes les wishlists" : "Ma wishlist"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats._count.id} liste{stats._count.id > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <WishlistStats mostWished={mostWished} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <WishlistGrid wishlists={wishlists} canShare={canShare} isAdminView={canViewAll} />
      </Suspense>
    </div>
  );
}
