// components/dashboard/dashboard-content.tsx
// Contenu du dashboard — reçoit la session déjà validée

import { Suspense } from "react";
import RevenueChart from "@/components/dashboard/widgets/revenue-chart";
import RecentOrders from "@/components/dashboard/widgets/recent-orders";
import TopProducts from "@/components/dashboard/widgets/top-products";
import CategoryBreakdown from "@/components/dashboard/widgets/category-breakdown";
import AuditLogPreview from "@/components/dashboard/widgets/audit-log-preview";
import TreasurySummary from "@/components/dashboard/widgets/treasury-summary";
import MediaStorageStats from "@/components/dashboard/widgets/media-storage-stats";
import WishlistActivity from "@/components/dashboard/widgets/wishlist-activity";
import VideoAnalytics from "@/components/dashboard/widgets/video-analytics";
import PaymentMethodDistribution from "@/components/dashboard/widgets/payment-method-distribution";
import UserActivityHeatmap from "@/components/dashboard/widgets/user-activity-heatmap";
import QuickActions from "@/components/dashboard/widgets/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardContentProps {
  session: {
    level: number;
    role: { name: string; color: string };
    effectivePermissions: Set<string>;
  };
}

export async function DashboardContent({ session }: DashboardContentProps) {
  const { level, effectivePermissions } = session;
  const hasPermission = (p: string) => effectivePermissions.has(p);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Niveau d&apos;accès :{" "}
            <span className="font-semibold" style={{ "--role-color": session.role.color } as React.CSSProperties}>
              {session.role.name} (Level {level})
            </span>
          </p>
        </div>
        <QuickActions className="w-full" />
      </div>

      {/* LEVEL 5 */}
      {hasPermission("analytics:view") && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <RevenueChart />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <TopProducts />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <WishlistActivity />
          </Suspense>
        </section>
      )}

      {/* LEVEL 4 */}
      {hasPermission("analytics:view") && (
        <section className="grid gap-4 md:grid-cols-2">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <RecentOrders />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <CategoryBreakdown />
          </Suspense>
        </section>
      )}

      {/* LEVEL 3 */}
      {hasPermission("analytics:view") && (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Suspense fallback={<Skeleton className="h-64" />}>
              <MediaStorageStats />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-64" />}>
              <VideoAnalytics />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-64" />}>
              <PaymentMethodDistribution />
            </Suspense>
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            <Suspense fallback={<Skeleton className="h-64" />}>
              <UserActivityHeatmap />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-64" />}>
              <TreasurySummary />
            </Suspense>
          </section>
        </>
      )}

      {/* LEVEL 2 */}
      {hasPermission("analytics:view") && (
        <section className="grid gap-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <AuditLogPreview />
          </Suspense>
        </section>
      )}

      {/* LEVEL 1 */}
      {hasPermission("analytics:view") && (
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