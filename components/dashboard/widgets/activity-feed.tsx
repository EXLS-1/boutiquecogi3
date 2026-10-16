// components/dashboard/widgets/activity-feed.tsx
// ============================================
// WIDGET : DERNIÈRES ACTIVITÉS (SNAPSHOTS FIGÉS)
// Permissions: system:logs
// Niveaux: LEVEL 1-2 (Super-Admin, Admin)
// ============================================
// Lecture directe des colonnes dénormalisées actorName / actorEmail :
// ZÉRO jointure sur la table user → performance maximale.
// Immunisé contre les modifications de profils futurs (le snapshot
// reflète l'état de l'utilisateur AU MOMENT de l'action).

import { Suspense } from "react";
import { Activity } from "lucide-react";
import { getLatestActivities } from "@/server/actions/audit.actions";
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

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function ActivityFeedContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Dernières activités" />;
  }

  const { role } = userData;
  const allowed = await hasPermission(role, PERMISSIONS.SYSTEM_LOGS);

  if (!allowed) {
    return <WidgetForbidden title="Dernières activités" />;
  }

  const activities = await getLatestActivities();

  return (
    <WidgetShell title="Dernières activités" icon={Activity} className={className}>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucune activité récente.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {activities.map((activity) => {
            // Résolution propre de l'affichage de l'acteur
            const displayActor =
              activity.actorName ?? activity.actorEmail ?? "Utilisateur inconnu";

            return (
              <li
                key={activity.id}
                className="py-3 flex justify-between items-center text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground">
                    {displayActor}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    a effectué l&apos;action :
                  </span>
                  <code className="ml-1 bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-blue-600">
                    {activity.action}
                  </code>
                </div>
                <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {new Date(activity.createdAt).toLocaleDateString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function ActivityFeed({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={5} />}>
      <ActivityFeedContent className={className} />
    </Suspense>
  );
}