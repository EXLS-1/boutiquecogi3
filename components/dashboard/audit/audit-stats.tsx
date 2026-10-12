// components/dashboard/audit/audit-stats.tsx
// Statistiques du journal d'audit : répartition par statut + actions les plus fréquentes.
// Consomme le résultat de `prisma.auditLog.groupBy` transmis par app/admin/dashboard/audit/page.tsx.
// Robustesse : compteurs validés, division par zéro évitée, statut null toléré, tri défensif.

import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Info } from "lucide-react";

// ───────────────────────────────────────────
// TYPES (alignés sur le résultat de Prisma groupBy)
// ───────────────────────────────────────────

type AuditStatusGroup = { status: string | null; _count: { id: number } };
type AuditEventGroup = { action: string; _count: { id: number } };

// ───────────────────────────────────────────
// HELPERS ROBUSTES
// ───────────────────────────────────────────

const MAX_TOP_EVENTS = 10;

/** Coerce un compteur Prisma en entier fini, non négatif (0 par défaut). */
function safeCount(count: { id?: number } | null | undefined): number {
  const raw = count?.id;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

/** Part en pourcentage, protégée contre la division par zéro et bornée à 100. */
function safePercent(part: number, total: number): number {
  if (total <= 0 || part <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

/** Clé de regroupement insensible au null / vide. */
function statusKey(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase() || "undefined";
}

/** Libellé lisible pour un statut éventuellement null ou vide. */
function statusLabel(status: string | null | undefined): string {
  const trimmed = status?.trim();
  return trimmed ? trimmed : "Non défini";
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

type StatusMeta = {
  variant: BadgeVariant;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
};

/** Mêmes conventions de sévérité que widgets/audit-log-preview.tsx. */
function getStatusMeta(status: string | null | undefined): StatusMeta {
  switch (statusKey(status)) {
    case "critical":
    case "error":
    case "failed":
    case "ko":
      return { variant: "destructive", className: "text-destructive", icon: AlertTriangle };
    case "warning":
    case "warn":
      return { variant: "secondary", className: "text-amber-600 dark:text-amber-400", icon: AlertTriangle };
    case "success":
    case "ok":
      return { variant: "default", className: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle };
    default:
      return { variant: "outline", className: "text-muted-foreground", icon: Info };
  }
}

/** Traduit les actions génériques en libellés lisibles (comme audit-log-preview). */
function formatActionLabel(action: string): string {
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

const numberFormatter = new Intl.NumberFormat("fr-FR");

function formatCount(count: number): string {
  return numberFormatter.format(count);
}

/** Normalise les groupes de statuts : agrège les doublons, ignore les entrées invalides. */
function normalizeStatusGroups(
  groups: AuditStatusGroup[]
): Array<{ key: string; label: string; count: number }> {
  const aggregated = new Map<string, { key: string; label: string; count: number }>();

  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    const key = statusKey(group.status ?? null);
    const count = safeCount(group._count);
    const existing = aggregated.get(key);
    if (existing) {
      existing.count += count;
    } else {
      aggregated.set(key, { key, label: statusLabel(group.status ?? null), count });
    }
  }

  // Tri défensif : ne pas supposer l'ordre fourni par le back-end.
  return [...aggregated.values()].sort((a, b) => b.count - a.count);
}

/** Normalise les actions : nettoie, exclut les comptes nuls, re-trie et borne la liste. */
function normalizeTopEvents(
  groups: AuditEventGroup[]
): Array<{ action: string; count: number }> {
  return groups
    .filter(
      (group): group is AuditEventGroup =>
        Boolean(group) && typeof group?.action === "string" && group.action.trim() !== ""
    )
    .map((group) => ({ action: group.action.trim(), count: safeCount(group._count) }))
    .filter((group) => group.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TOP_EVENTS);
}

// ───────────────────────────────────────────
// SOUS-COMPOSANTS
// ───────────────────────────────────────────

function Bar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${className ?? "bg-primary"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// ───────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ───────────────────────────────────────────

export function AuditStats({
  stats = [],
  events = [],
}: {
  stats?: AuditStatusGroup[];
  events?: AuditEventGroup[];
}) {
  const statusGroups = normalizeStatusGroups(Array.isArray(stats) ? stats : []);
  const topEvents = normalizeTopEvents(Array.isArray(events) ? events : []);

  const totalEntries = statusGroups.reduce((sum, group) => sum + group.count, 0);
  const hasStatusData = statusGroups.length > 0 && totalEntries > 0;
  const hasEventData = topEvents.length > 0;
  const maxEventCount = hasEventData ? topEvents[0].count : 0;

  if (!hasStatusData && !hasEventData) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aucune statistique d&apos;audit disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">Statistiques d&apos;audit</h2>
        <Badge variant="outline" className="ml-auto tabular-nums">
          {formatCount(totalEntries)} entrée{totalEntries > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Répartition par statut */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Répartition par statut</p>
          {hasStatusData ? (
            <div className="space-y-2.5">
              {statusGroups.map((group) => {
                const meta = getStatusMeta(group.key === "undefined" ? null : group.key);
                const Icon = meta.icon;
                const percent = safePercent(group.count, totalEntries);

                return (
                  <div key={group.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.className}`} aria-hidden />
                        <Badge variant={meta.variant} className="text-[10px]">
                          {group.label}
                        </Badge>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatCount(group.count)} · {percent}%
                      </span>
                    </div>
                    <Bar percent={percent} className={meta.className} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune donnée de statut.</p>
          )}
        </div>

        {/* Actions les plus fréquentes */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Actions les plus fréquentes
            {hasEventData && <span className="ml-1 font-normal">(top {topEvents.length})</span>}
          </p>
          {hasEventData ? (
            <div className="space-y-2.5">
              {topEvents.map((event) => {
                const percent = safePercent(event.count, maxEventCount);

                return (
                  <div key={event.action} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs" title={event.action}>
                        {formatActionLabel(event.action)}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatCount(event.count)}
                      </span>
                    </div>
                    <Bar percent={percent} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune donnée d&apos;action.</p>
          )}
        </div>
      </div>
    </div>
  );
}
