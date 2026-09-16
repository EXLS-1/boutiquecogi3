// components/admin/shared/admin-empty-state.tsx
// =============================================================================
// ÉTAT VIDE / DÉGRADÉ — Un tableau vide n'est pas une erreur
// =============================================================================
// Deux cas distincts, volontairement séparés :
//   • AdminEmptyState  → lecture réussie mais aucun enregistrement
//   • AdminDegradedState → lecture impossible (voir safeQuery) : on l'affiche
//     explicitement plutôt que de laisser croire à un « 0 » métier.

import { AlertTriangle, Inbox } from "lucide-react";

interface AdminEmptyStateProps {
  readonly title?: string;
  readonly message: string;
  readonly hint?: string;
  readonly action?: React.ReactNode;
}

export function AdminEmptyState({
  title = "Aucune donnée",
  message,
  hint,
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{message}</p>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

interface AdminDegradedStateProps {
  /** Ce qui n'a pas pu être lu (ex. « journaux d'audit »). */
  readonly subject: string;
  readonly hint?: string;
}

export function AdminDegradedState({
  subject,
  hint = "La requête a échoué côté serveur : l'erreur a été journalisée (préfixe [admin:read]). Aucune donnée n'est affichée plutôt qu'une valeur erronée.",
}: AdminDegradedStateProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
      <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-amber-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-amber-900">
        {subject} indisponible(s)
      </p>
      <p className="mx-auto mt-1 max-w-lg text-xs text-amber-800">{hint}</p>
    </div>
  );
}

/** Encart d'explication « module non configuré » (dépendance externe absente). */
export function AdminInfoPanel({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}