// components/catalog/partial-error-banner.tsx
/**
 * =============================================================================
 * PARTIAL ERROR BANNER
 * =============================================================================
 * Bannière d'erreurs partielles (non bloquante).
 * Affiche les sources d'erreur sans interrompre l'expérience utilisateur.
 */

import { AlertTriangle } from "lucide-react";
import type { PartialError } from "@/lib/product-catalog/catalog-page-types";

interface PartialErrorBannerProps {
  readonly errors: readonly PartialError[];
  readonly context?: string;
}

/**
 * Bannière d'avertissement pour erreurs partielles de chargement.
 * @param errors — Liste des erreurs partielles à afficher
 * @param context — Contexte optionnel (préfix du message)
 */
export function PartialErrorBanner({
  errors,
  context = "Certaines données n'ont pas pu être chargées",
}: PartialErrorBannerProps) {
  return (
    <div
      className="p-4 border border-amber-200 bg-amber-50 rounded-xl flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle
        className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0"
        aria-hidden="true"
      />
      <div>
        <p className="text-amber-800 font-medium text-sm">{context}</p>
        <ul className="mt-1 text-amber-700 text-xs space-y-0.5">
          {errors.map((err, i) => (
            <li key={i}>
              • {err.source}: {err.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
