// components/dashboard/widgets/audit-log-preview.tsx
// ============================================
// WIDGET : APERÇU DU JOURNAL D'AUDIT
// Permissions: system:logs
// Niveaux: LEVEL 1-2 (Super-Admin, Admin)
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
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { Shield, AlertTriangle, Info, CheckCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userName: string | null;
  severity: string;
  createdAt: Date;
  details: string | null;
}

// ───────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────

function getSeverityIcon(severity: string) {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
    case "ERROR":
      return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    case "WARNING":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    case "SUCCESS":
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    default:
      return <Info className="h-3.5 w-3.5 text-blue-500" />;
  }
}

function getSeverityBadgeVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "destructive";
    case "WARNING":
      return "secondary";
    case "SUCCESS":
      return "default";
    default:
      return "outline";
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE: "Création",
    UPDATE: "Modification",
    DELETE: "Suppression",
    LOGIN: "Connexion",
    LOGOUT: "Déconnexion",
    EXPORT: "Export",
    IMPORT: "Import",
    SETTINGS_CHANGE: "Paramètres",
    ROLE_CHANGE: "Rôle",
    BULK_ACTION: "Action groupée",
  };
  return labels[action.toUpperCase()] ?? action;
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchAuditLogs(limit: number = 6): Promise<AuditEntry[]> {
  const logs = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      userName: true,
      severity: true,
      createdAt: true,
      details: true,
    },
  });

  return logs;
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function AuditLogPreviewContent({
  className,
  limit = 6,
}: WidgetProps & { limit?: number }) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Journal d'audit" />;
  }

  const { role } = userData;
  const allowed = await hasPermission(role, PERMISSIONS.SYSTEM_LOGS);

  if (!allowed) {
    return <WidgetForbidden title="Journal d'audit" />;
  }

  const logs = await fetchAuditLogs(limit);

  return (
    <WidgetShell
      title="Journal d'audit"
      icon={Shield}
      className={className}
      action={
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/dashboard/audit">
            Voir tout <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune entrée d'audit.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5 shrink-0">{getSeverityIcon(log.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getSeverityBadgeVariant(log.severity)} className="text-[10px] h-4 px-1">
                    {getActionLabel(log.action)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {log.entity}
                    {log.entityId && (
                      <span className="ml-1 font-mono text-[10px]">
                        #{log.entityId.slice(0, 8)}
                      </span>
                    )}
                  </span>
                </div>
                {log.userName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    par <span className="font-medium">{log.userName}</span>
                  </p>
                )}
                {log.details && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {log.details}
                  </p>
                )}
              </div>
              <time className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {log.createdAt.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          ))
        )}
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function AuditLogPreview({
  className,
  limit,
}: WidgetProps & { limit?: number }) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={5} />}>
      <AuditLogPreviewContent className={className} limit={limit} />
    </Suspense>
  );
}
