// app/dashboard/orders/page.tsx
// Gestion des commandes avec RBAC
// Level 6 : ses commandes | Level 4+ : toutes les commandes

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { OrderStatusFilter } from "@/components/dashboard/orders/order-status-filter";
import { OrdersTable } from "@/components/dashboard/orders/orders-table";
import { OrderStatsCards } from "@/components/dashboard/orders/order-stats-cards";
import { Skeleton } from "@/components/ui/skeleton";

interface OrdersPageProps {
  searchParams: Promise<{ status?: string; page?: string; limit?: string }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/signin");

  const { level, userId, effectivePermissions } = session;
  const params = await searchParams;

  // Level 6 (Client) : uniquement ses propres commandes
  // Level 4-1 (Moderator+) : toutes les commandes
  const isModerator = level <= 4;
  const canViewAll = effectivePermissions.has("orders:read") && isModerator;

  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const statusFilter = params.status;

  const where = {
    ...(statusFilter && { status: statusFilter }),
    ...(!canViewAll && { userId }),
  };

  const [orders, total, stats] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: { include: { product: { select: { name: true, images: true } } } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {canViewAll ? "Toutes les commandes" : "Mes commandes"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {total} commande{total > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-24" />}>
        <OrderStatsCards stats={stats} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-12" />}>
        <OrderStatusFilter activeStatus={statusFilter} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <OrdersTable 
          orders={orders} 
          total={total} 
          page={page} 
          limit={limit}
          canManage={isModerator}
          canRefund={level <= 3 && effectivePermissions.has("orders:process_refund")}
          canCancel={level <= 4 && effectivePermissions.has("orders:cancel")}
        />
      </Suspense>
    </div>
  );
}
