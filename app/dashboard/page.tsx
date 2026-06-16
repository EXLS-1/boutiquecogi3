// app/dashboard/page.tsx
// Page d'accueil du dashboard - affiche les widgets selon le niveau RBAC
// HIÉRARCHIE DESCENDANTE : Level 1 = SUPER_ADMIN → Level 6 = CLIENT

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

// Widgets par domaine
import { OverviewStats } from "@/components/dashboard/widgets/overview-stats";
import { RevenueChart } from "@/components/dashboard/widgets/revenue-chart";
import { RecentOrders } from "@/components/dashboard/widgets/recent-orders";
import { TopProducts } from "@/components/dashboard/widgets/top-products";
import { CategoryBreakdown } from "@/components/dashboard/widgets/category-breakdown";
import { AuditLogPreview } from "@/components/dashboard/widgets/audit-log-preview";
import { TreasurySummary } from "@/components/dashboard/widgets/treasury-summary";
import { MediaStorageStats } from "@/components/dashboard/widgets/media-storage-stats";
import { WishlistActivity } from "@/components/dashboard/widgets/wishlist-activity";
import { VideoAnalytics } from "@/components/dashboard/widgets/video-analytics";
import { PaymentMethodDistribution } from "@/components/dashboard/widgets/payment-method-distribution";
import { UserActivityHeatmap } from "@/components/dashboard/widgets/user-activity-heatmap";
import { QuickActions } from "@/components/dashboard/widgets/quick-actions";

import { Skeleton } from "@/components/ui/skeleton";

// =============================================================================
// FETCHERS DE DONNÉES (Server-Side)
// =============================================================================

async function getOverviewStats() {
  const [totalOrders, totalRevenue, totalUsers, totalProducts] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.user.count(),
    prisma.product.count(),
  ]);

  return {
    totalOrders,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    totalUsers,
    totalProducts,
    growthRate: 12.5,
  };
}

async function getRecentOrders(limit: number = 10) {
  return prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: { include: { product: { select: { name: true, images: true } } } },
    },
  });
}

async function getTopProducts(limit: number = 5) {
  return prisma.product.findMany({
    take: limit,
    orderBy: { soldCount: "desc" },
    select: {
      id: true,
      name: true,
      price: true,
      soldCount: true,
      images: true,
      category: { select: { name: true } },
    },
  });
}

async function getCategoryBreakdown() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { products: { _count: "desc" } },
    take: 8,
  });
}

async function getAuditLogs(limit: number = 5) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, name: true } } },
  });
}

async function getTreasurySummary() {
  const [pendingRevenue, refundedTotal, todayRevenue] = await Promise.all([
    prisma.order.aggregate({ where: { status: "pending" }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { status: "refunded" }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    pendingRevenue: pendingRevenue._sum.totalAmount || 0,
    refundedTotal: refundedTotal._sum.totalAmount || 0,
    todayRevenue: todayRevenue._sum.totalAmount || 0,
  };
}

async function getMediaStats() {
  const [totalFiles, totalSize, byType] = await Promise.all([
    prisma.media.count(),
    prisma.media.aggregate({ _sum: { size: true } }),
    prisma.media.groupBy({ by: ["type"], _count: { id: true }, _sum: { size: true } }),
  ]);

  return { totalFiles, totalSize: totalSize._sum.size || 0, byType };
}

async function getWishlistStats() {
  const [totalWishlists, totalItems, mostWished] = await Promise.all([
    prisma.wishlist.count(),
    prisma.wishlistItem.count(),
    prisma.product.findMany({
      take: 5,
      orderBy: { wishlistCount: "desc" },
      select: { id: true, name: true, wishlistCount: true, images: true },
    }),
  ]);

  return { totalWishlists, totalItems, mostWished };
}

async function getVideoStats() {
  return prisma.video.findMany({
    take: 5,
    orderBy: { views: "desc" },
    select: { id: true, title: true, views: true, duration: true, type: true, thumbnail: true },
  });
}

async function getPaymentDistribution() {
  return prisma.order.groupBy({
    by: ["paymentMethod"],
    _count: { id: true },
    _sum: { totalAmount: true },
  });
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default async function DashboardPage() {
  const session = await getServerRBACSession();
  if (!session) return null;

  const { level, effectivePermissions } = session;
  const hasPermission = (p: string) => effectivePermissions.has(p as any);

  // =============================================================================
  // HIÉRARCHIE DESCENDANTE : Level 1 = SUPER_ADMIN → Level 6 = CLIENT
  // =============================================================================
  // Plus le niveau est petit, plus l'utilisateur est haut dans la hiérarchie

  return (
    <div className="space-y-6">
      {/* En-tête avec info rôle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Niveau d&apos;accès :{" "}
            <span className="font-semibold" style={{ color: session.role.color }}>
              {session.role.name} (Level {level})
            </span>
          </p>
        </div>
        <QuickActions level={level} permissions={Array.from(effectivePermissions)} />
      </div>

      {/* ================================================================ */}
      {/* LEVEL 6 : CLIENT - Vue basique (commandes, wishlist) */}
      {/* ================================================================ */}
      {level >= 6 && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Suspense fallback={<Skeleton className="h-32" />}>
            <OverviewStats data={getOverviewStats()} />
          </Suspense>
        </section>
      )}

      {/* ================================================================ */}
      {/* LEVEL 5 : VENDEUR - Vue commerciale (produits, médias) */}
      {/* ================================================================ */}
      {level <= 5 && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <RevenueChart />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <TopProducts data={getTopProducts()} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <WishlistActivity data={getWishlistStats()} />
          </Suspense>
        </section>
      )}

      {/* ================================================================ */}
      {/* LEVEL 4 : MODÉRATEUR - Gestion contenu & commandes */}
      {/* ================================================================ */}
      {level <= 4 && (
        <section className="grid gap-4 md:grid-cols-2">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <RecentOrders data={getRecentOrders()} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <CategoryBreakdown data={getCategoryBreakdown()} />
          </Suspense>
        </section>
      )}

      {/* ================================================================ */}
      {/* LEVEL 3 : MANAGER - Analytics avancées & médias */}
      {/* ================================================================ */}
      {level <= 3 && (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Suspense fallback={<Skeleton className="h-64" />}>
              <MediaStorageStats data={getMediaStats()} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-64" />}>
              <VideoAnalytics data={getVideoStats()} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-64" />}>
              <PaymentMethodDistribution data={getPaymentDistribution()} />
            </Suspense>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Suspense fallback={<Skeleton className="h-64" />}>
              <UserActivityHeatmap />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-64" />}>
              <TreasurySummary data={getTreasurySummary()} />
            </Suspense>
          </section>
        </>
      )}

      {/* ================================================================ */}
      {/* LEVEL 2 : ADMIN - Audit & configuration système */}
      {/* ================================================================ */}
      {level <= 2 && (
        <section className="grid gap-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <AuditLogPreview data={getAuditLogs()} />
          </Suspense>
        </section>
      )}

      {/* ================================================================ */}
      {/* LEVEL 1 : SUPER ADMIN - Tout + outils système */}
      {/* ================================================================ */}
      {level <= 1 && (
        <section className="grid gap-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
            <h3 className="text-lg font-semibold text-destructive">
              Zone Super Admin
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Accès aux outils système, configuration globale et gestion des rôles.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
