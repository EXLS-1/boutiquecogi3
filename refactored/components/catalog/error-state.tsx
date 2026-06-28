/**
 * =============================================================================
 * ERROR STATE
 * =============================================================================
 * État d'erreur affiché quand le chargement des données a échoué.
 */

import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  readonly message: string;
  readonly subMessage?: string;
}

/**
 * État d'erreur avec icône et message.
 * @param message — Message d'erreur principal
 * @param subMessage — Message secondaire (conseil de contact support)
 */
export function ErrorState({
  message,
  subMessage = "Si le problème persiste, contactez notre support.",
}: ErrorStateProps) {
  return (
    <div className="text-center py-16 border border-red-200 bg-red-50 rounded-xl">
      <AlertTriangle
        className="h-12 w-12 text-red-300 mx-auto mb-4"
        aria-hidden="true"
      />
      <p className="text-red-600 text-lg font-medium">{message}</p>
      {subMessage && (
        <p className="text-red-400 text-sm mt-2">{subMessage}</p>
      )}
    </div>
  );
}
