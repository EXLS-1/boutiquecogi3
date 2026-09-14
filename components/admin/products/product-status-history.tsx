// components/admin/products/product-status-history.tsx
// COMPONENT — Historique des statuts d'un produit (onglet "Historique")
// =============================================================================
// Affiche le fil d'historique des transitions de statut du produit.
// =============================================================================

import { History } from "lucide-react";

type HistoryEntry = {
  id: string;
  oldStatus?: string | null;
  newStatus: string;
  reason?: string | null;
  changedAt?: Date | string;
  changedBy?: { id: string; name?: string | null } | null;
};

function formatDate(value: Date | string | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR");
}

export function ProductStatusHistory({ history }: { history: HistoryEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <History className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-2 text-sm text-slate-500">
          Aucune transition de statut enregistrée.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-700">
          Historique des statuts
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {history.map((entry) => (
          <li key={entry.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-slate-400">{entry.oldStatus ?? "—"}</span>
                <span className="text-slate-400">→</span>
                <span className="font-medium text-slate-800">{entry.newStatus}</span>
              </div>
              <time className="shrink-0 text-xs text-slate-400">
                {formatDate(entry.changedAt)}
              </time>
            </div>
            {entry.reason && (
              <p className="mt-1 text-xs text-slate-500">{entry.reason}</p>
            )}
            {entry.changedBy?.name && (
              <p className="mt-1 text-xs text-slate-400">
                Par {entry.changedBy.name}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}