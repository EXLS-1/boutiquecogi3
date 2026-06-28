// components/catalog/catalog-breadcrumb.tsx
/**
 * =============================================================================
 * CATEGORY BREADCRUMB
 * =============================================================================
 * Fil d'Ariane pour la navigation dans les catégories.
 * Composant serveur.
 */

import Link from "next/link";

interface CategoryBreadcrumbProps {
  readonly categoryName: string;
}

/**
 * Fil d'Ariane : Catalogue / [Nom de la catégorie].
 */
export function CategoryBreadcrumb({ categoryName }: CategoryBreadcrumbProps) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-6">
      <ol className="flex items-center gap-2 text-sm text-slate-500">
        <li>
          <Link
            href="/catalogue"
            className="hover:text-cyan-600 transition-colors"
          >
            Catalogue
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="text-slate-900 font-medium" aria-current="page">
          {categoryName}
        </li>
      </ol>
    </nav>
  );
}
