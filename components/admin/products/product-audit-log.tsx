// components/admin/products/product-audit-log.tsx
// COMPONENT — Journal d'audit d'un produit (onglet "Audit")
// =============================================================================
// Affiche les entrées de log d'audit associées au produit.
// =============================================================================

import { FileText, ShieldCheck } from "lucide-react";

type AuditEntry = {
  id: string;
  action?: string | null;
  actorName?: string | null;
  targetType?: string | null;
  createdAt?: Date | string;
};

function formatDate(value: Date | string | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR");
}

export function ProductAuditLog({ logs }: { logs: AuditEntry[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-2 text-sm text-slate-500">
          Aucune entrée d&apos;audit enregistrée.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <ShieldCheck className="h-4 w-4" />
          Journal d&apos;audit
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50 text-left">
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Acteur</th>
            <th className="px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-2 font-medium text-slate-700">
                {log.action ?? "—"}
              </td>
              <td className="px-4 py-2 text-slate-500">
                {log.actorName ?? "—"}
              </td>
              <td className="px-4 py-2 text-slate-400">
                {formatDate(log.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}