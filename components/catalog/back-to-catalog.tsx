// components/catalog/back-to-catalog.tsx
/**
 * =============================================================================
 * BACK TO CATALOG
 * =============================================================================
 * Lien de retour vers la page index du catalogue.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackToCatalog() {
  return (
    <div className="mt-12 text-center">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-cyan-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour au catalogue
      </Link>
    </div>
  );
}