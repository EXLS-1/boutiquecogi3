// app/dashboard/analytics/page.tsx
// Analytics avec RBAC
// Level 3+ (Manager+) : lecture | Level 2+ (Admin+) : export

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { RevenueChart } from "@/components/dashboard/analytics/revenue-chart";
import { UserGrowthChart } from "@/components/dashboard/analytics/user-growth-chart";
import { ProductPerformance } from "@/components/dashboard/analytics/product-performance";
import { ExportPanel } from "@/components/dashboard/analytics/export-panel";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsPageProps {
  searchParams: Promise<{ period?: string; metric?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { level, effectivePermissions } = session;

  if (level > 3) redirect("/unauthorized");

  const canExport = level <= 2 && effectivePermissions.has("analytics:export");
  const params = await searchParams;
  const period = params.period || "30d";

  const [revenueData, userGrowth, topProducts] = await Promise.all([
    prisma.order.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.user.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _count: { id: true },
    }),
    prisma.product.findMany({
      take: 20,
      orderBy: { soldCount: "desc" },
      select: { id: true, name: true, soldCount: true, revenue: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Période: {period}</p>
        </div>
        {canExport && <ExportPanel />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <RevenueChart data={revenueData} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-80" />}>
          <UserGrowthChart data={userGrowth} />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProductPerformance products={topProducts} />
      </Suspense>
    </div>
  );
}
