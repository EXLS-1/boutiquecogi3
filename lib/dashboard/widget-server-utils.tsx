// lib/dashboard/widget-server-utils.ts
// ============================================
// UTILITAIRES SERVER-SIDE POUR LES WIDGETS DASHBOARD
// PUREMENT server-side — Atomicité & Modularité
// ============================================

import { ReactNode } from "react";
import {
  getCurrentUserWithRole,
  hasPermission,
  hasAllPermissions,
  getRoleLevel,
  PERMISSIONS,
  type Permission,
  type Role,
} from "@/lib/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";

// ───────────────────────────────────────────
// TYPES COMMUNS
// ───────────────────────────────────────────

export interface WidgetProps {
  className?: string;
}

export type TimeRange = "7d" | "30d" | "90d" | "1y";

// ───────────────────────────────────────────
// GUARD : Vérification RBAC pour widgets
// ───────────────────────────────────────────

export interface WidgetGuardResult {
  allowed: boolean;
  role: Role | null;
  level: number;
  isAuthenticated: boolean;
}

export async function checkWidgetAccess(
  requiredPermissions?: Permission | Permission[],
  minLevel?: number,
): Promise<WidgetGuardResult> {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return { allowed: false, role: null, level: 6, isAuthenticated: false };
  }

  const { role, level } = userData;

  if (minLevel !== undefined && level > minLevel) {
    return { allowed: false, role, level, isAuthenticated: true };
  }

  if (requiredPermissions) {
    const perms = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];
    const hasAll = await hasAllPermissions(role, perms);
    if (!hasAll) {
      return { allowed: false, role, level, isAuthenticated: true };
    }
  }

  return { allowed: true, role, level, isAuthenticated: true };
}

// ───────────────────────────────────────────
// SHELL UI COMMUN
// ───────────────────────────────────────────

export function WidgetShell({
  title,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </CardTitle>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────
// FALLBACKS
// ───────────────────────────────────────────

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function WidgetForbidden({ title }: { title: string }) {
  return (
    <WidgetShell title={title}>
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Lock className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Accès restreint</p>
        <p className="text-xs opacity-70">
          Privilèges insuffisants pour afficher ces données.
        </p>
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// HELPERS DATE
// ───────────────────────────────────────────

export function getDateRange(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return { start, end };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
