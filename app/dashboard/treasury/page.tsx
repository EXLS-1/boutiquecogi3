// app/dashboard/treasury/page.tsx
// Trésorerie avec RBAC
// Level 3+ (Manager+) : lecture transactions | Level 2+ (Admin+) : remboursements

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { TreasuryOverview } from "@/components/dashboard/treasury/treasury-overview";
import { TransactionTable } from "@/components/dashboard/treasury/transaction-table";
import { PaymentMethodConfig } from "@/components/dashboard/treasury/payment-method-config";
import { Skeleton } from "@/components/ui/skeleton";

interface TreasuryPageProps {
  searchParams: Promise<{ tab?: string; period?: string }>;
}

export default async function TreasuryPage({ searchParams }: TreasuryPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { level, effectivePermissions } = session;
  const params = await searchParams;

  if (level > 3) redirect("/unauthorized");

  const canRefund = effectivePermissions.has("payments:refund");
  const canConfigure = effectivePermissions.has("payments:configure");
  const canViewAnalytics = effectivePermissions.has("payments:view_analytics");

  const period = params.period || "30d";

  const [transactions, stats, paymentMethods] = await Promise.all([
    prisma.payment.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { order: { select: { id: true, totalAmount: true, status: true } } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.payment.groupBy({ by: ["method"], _count: { id: true }, _sum: { amount: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trésorerie</h1>
          <p className="text-muted-foreground mt-1">
            {(stats._sum.amount || 0).toLocaleString()} FCFA sur {stats._count} transactions
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-48" />}>
        <TreasuryOverview stats={stats} paymentMethods={paymentMethods} canViewAnalytics={canViewAnalytics} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <TransactionTable transactions={transactions} canRefund={canRefund} />
      </Suspense>

      {canConfigure && (
        <Suspense fallback={<Skeleton className="h-64" />}>
          <PaymentMethodConfig methods={paymentMethods} />
        </Suspense>
      )}
    </div>
  );
}
