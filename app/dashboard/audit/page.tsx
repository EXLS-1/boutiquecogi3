// app/dashboard/audit/page.tsx
// Journal d'audit avec RBAC
// Level 2+ (Admin+) : lecture | Level 1 (Super Admin) : configuration

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { AuditLogTable } from "@/components/dashboard/audit/audit-log-table";
import { AuditFilters } from "@/components/dashboard/audit/audit-filters";
import { AuditStats } from "@/components/dashboard/audit/audit-stats";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditPageProps {
  searchParams: Promise<{
    event?: string; severity?: string; userId?: string;
    dateFrom?: string; dateTo?: string; page?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { level, effectivePermissions } = session;

  if (level > 2) redirect("/unauthorized");

  const canConfigure = level <= 1 && effectivePermissions.has("settings:system_config");
  const canExport = effectivePermissions.has("analytics:export");

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 50;

  const where = {
    ...(params.event && { event: params.event }),
    ...(params.severity && { severity: params.severity }),
    ...(params.userId && { userId: params.userId }),
    ...(params.dateFrom && params.dateTo && {
      createdAt: { gte: new Date(params.dateFrom), lte: new Date(params.dateTo) },
    }),
  };

  const [logs, total, stats, events] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["severity"], _count: { id: true } }),
    prisma.auditLog.groupBy({ by: ["event"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal d&apos;audit</h1>
          <p className="text-muted-foreground mt-1">
            {total} entrée{total > 1 ? "s" : ""} · <span className="text-destructive font-medium">Immuable</span>
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <AuditStats stats={stats} events={events} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-16" />}>
        <AuditFilters events={events.map((e) => e.event)} canExport={canExport} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <AuditLogTable logs={logs} total={total} page={page} limit={limit} canConfigure={canConfigure} />
      </Suspense>
    </div>
  );
}
