// components/dashboard/widgets/wishlist-activity.tsx
// ============================================
// WIDGET : ACTIVITÉ LISTES DE SOUHAITS
// Permissions: analytics:read
// Niveaux: LEVEL 1-4 (Super-Admin → Editor)
// ============================================

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  getCurrentUserWithRole,
  hasPermission,
} from "@/lib/auth/rbac";
import {
  WidgetShell,
  WidgetSkeleton,
  WidgetForbidden,
  formatNumber,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { Heart, TrendingUp, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface WishlistTrend {
  productId: string;
  productName: string;
  wishlistCount: number;
  conversionRate: number;
}

interface WishlistStats {
  totalWishlists: number;
  totalItems: number;
  topProducts: WishlistTrend[];
  recentAdditions: number;
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchWishlistStats(): Promise<WishlistStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalWishlists, totalItems, recentAdditions, topProducts] = await Promise.all([
    prisma.wishlist.count(),
    prisma.wishlistItem.count(),
    prisma.wishlistItem.count({
      where: { addedAt: { gte: sevenDaysAgo } },
    }),
    prisma.wishlistItem.groupBy({
      by: ["productId"],
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
  ]);

  // Récupérer les noms des produits
  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p.name]));

  const enrichedTopProducts: WishlistTrend[] = topProducts.map((p) => ({
    productId: p.productId,
    productName: productMap.get(p.productId) ?? "Produit inconnu",
    wishlistCount: p._count.productId,
    conversionRate: 0, // Calculé séparément si besoin
  }));

  return {
    totalWishlists,
    totalItems,
    topProducts: enrichedTopProducts,
    recentAdditions,
  };
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function WishlistActivityContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Listes de souhaits" />;
  }

  const { role } = userData;
  const allowed = await hasPermission(role, PERMISSIONS.ANALYTICS_READ);

  if (!allowed) {
    return <WidgetForbidden title="Listes de souhaits" />;
  }

  const stats = await fetchWishlistStats();

  return (
    <WidgetShell
      title="Listes de souhaits"
      icon={Heart}
      className={className}
      action={
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/dashboard/analytics/wishlists">
            Détails <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{formatNumber(stats.totalWishlists)}</p>
            <p className="text-[10px] text-muted-foreground">Listes</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{formatNumber(stats.totalItems)}</p>
            <p className="text-[10px] text-muted-foreground">Articles</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-emerald-600">
              +{formatNumber(stats.recentAdditions)}
            </p>
            <p className="text-[10px] text-muted-foreground">7j</p>
          </div>
        </div>

        {/* Top produits */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Produits favoris
          </p>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune donnée de liste de souhaits.
            </p>
          ) : (
            stats.topProducts.map((product, index) => (
              <div
                key={product.productId}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs font-bold text-muted-foreground w-4 text-center">
                  {index + 1}
                </span>
                <Link
                  href={`/dashboard/products/${product.productId}`}
                  className="flex-1 text-xs font-medium truncate hover:underline"
                >
                  {product.productName}
                </Link>
                <Badge variant="secondary" className="text-[10px] h-5">
                  <Heart className="h-2.5 w-2.5 mr-0.5" />
                  {formatNumber(product.wishlistCount)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function WishlistActivity({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={5} />}>
      <WishlistActivityContent className={className} />
    </Suspense>
  );
}
