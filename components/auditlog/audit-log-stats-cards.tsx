import {
  Activity,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditLogStats } from "@/lib/audit/types";

const numberFormatter = new Intl.NumberFormat("fr-FR");

export function AuditLogStatsCards({ stats }: { stats: AuditLogStats }) {
  const cards = [
    {
      label: "Total des événements",
      value: stats.total,
      icon: Activity,
      color: "text-cyan-700",
    },
    {
      label: "Informations",
      value: stats.bySeverity.INFO ?? 0,
      icon: Info,
      color: "text-slate-600",
    },
    {
      label: "Avertissements",
      value: stats.bySeverity.WARNING ?? 0,
      icon: AlertTriangle,
      color: "text-amber-600",
    },
    {
      label: "Erreurs critiques",
      value:
        (stats.bySeverity.ERROR ?? 0) +
        (stats.bySeverity.CRITICAL ?? 0),
      icon: ShieldAlert,
      color: "text-red-600",
    },
  ];

  return (
    <section
      aria-label="Statistiques des journaux d'audit sur les 30 derniers jours"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            <Icon aria-hidden className={`h-4 w-4 ${color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {numberFormatter.format(value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
