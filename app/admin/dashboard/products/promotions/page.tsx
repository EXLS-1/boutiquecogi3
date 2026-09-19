// app/dashboard/promotions/page.tsx
// Promotions avec RBAC
// Level 2+ (Admin+) : CRUD | Level 1 (Super Admin) : config avancée

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { PromotionsTable } from "@/components/dashboard/promotions/promotions-table";
import { CouponManager } from "@/components/dashboard/promotions/coupon-manager";
import { PromotionStats } from "@/components/dashboard/promotions/promotion-stats";
import { Skeleton } from "@/components/ui/skeleton";

interface PromotionsPageProps {
  searchParams: Promise<{ tab?: string; status?: string }>;
}

export default async function PromotionsPage({ searchParams }: PromotionsPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { level, effectivePermissions } = session;

  if (level > 2) redirect("/unauthorized");

  const canCreate = effectivePermissions.has("promotions:create");
  const canUpdate = effectivePermissions.has("promotions:update");
  const canDelete = effectivePermissions.has("promotions:delete");
  const canManageCoupons = effectivePermissions.has("promotions:manage_coupons");

  const params = await searchParams;
  const tab = params.tab || "campaigns";

  // Le modèle Promotion n'existe plus dans le schéma : les campagnes sont
  // gérées via les coupons (remise appliquée directement aux produits).
  const [promotions, coupons, stats] = await Promise.all([
    Promise.resolve([] as Awaited<ReturnType<typeof prisma.coupon.findMany>>),
    prisma.coupon.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.aggregate({ _count: { id: true }, _sum: { discountValue: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground mt-1">
            {stats._count.id} campagnes · {(stats._sum.discountValue || 0).toLocaleString()} FCFA remisés
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <PromotionStats stats={stats} />
      </Suspense>

      {tab === "campaigns" && (
        <Suspense fallback={<Skeleton className="h-96" />}>
          <PromotionsTable promotions={promotions} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
        </Suspense>
      )}

      {tab === "coupons" && canManageCoupons && (
        <Suspense fallback={<Skeleton className="h-96" />}>
          <CouponManager coupons={coupons} />
        </Suspense>
      )}
    </div>
  );
}
