// components/catalog/empty-state.tsx
/**
 * =============================================================================
 * EMPTY STATE
 * =============================================================================
 * État vide affiché quand aucun produit n'est disponible.
 */

import { PackageSearch } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  readonly message: string;
  readonly showBackLink?: boolean;
  readonly backHref?: string;
  readonly backLabel?: string;
}

/**
 * État vide avec icône et message.
 * @param message — Message à afficher
 * @param showBackLink — Affiche un lien de retour vers le catalogue
 * @param backHref — URL du lien de retour
 * @param backLabel — Label du lien de retour
 */
export function EmptyState({
  message,
  showBackLink = false,
  backHref = "/catalogue",
  backLabel = "Explorer le catalogue",
}: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <PackageSearch
        className="h-12 w-12 text-slate-300 mx-auto mb-4"
        aria-hidden="true"
      />
      <p className="text-slate-500 text-lg">{message}</p>
      {showBackLink && (
        <Link
          href={backHref}
          className="inline-block mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
        >
          {backLabel}
        </Link>
      )}
    </div>
  );
}
