// components/catalog/back-to-catalog.tsx
/**
 * =============================================================================
 * BACK TO CATALOG LINK
 * =============================================================================
 * Lien de retour vers la page catalogue principale.
 * Composant serveur.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackToCatalogProps {
  readonly label?: string;
  readonly className?: string;
}

/**
 * Lien de retour au catalogue avec flèche.
 */
export function BackToCatalog({
  label = "Retour au catalogue",
  className = "mt-16 text-center",
}: BackToCatalogProps) {
  return (
    <div className={className}>
      <Link
        href="/catalogue"
        className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    </div>
  );
}
