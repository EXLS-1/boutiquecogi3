// components/product-catalog/category.tsx

import type { CatalogCategory } from "@/lib/product-catalog/catalog-page-types";
import type { RbacLevel } from "@/lib/product-category/category-types";

export interface CategoryListProps {
  readonly userRbacLevel: RbacLevel;
  readonly isAuthenticated: boolean;
  readonly categories: readonly CatalogCategory[];
}

export default function Category({
  userRbacLevel,
  isAuthenticated,
  categories,
}: CategoryListProps) {
  return (
    <section className="py-8" aria-label="Catégories">
      <ul className="flex flex-wrap gap-3">
        {categories.map((category) => {
          const showCategory =
            typeof category.id === "string" &&
            typeof category.name === "string" &&
            typeof category.slug === "string";

          if (!showCategory) return null;

          return (
            <li key={category.slug}>
              <a
                href={`/catalog/${category.slug}`}
                className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                {category.name}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
