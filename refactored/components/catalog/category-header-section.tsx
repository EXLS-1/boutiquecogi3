/**
 * =============================================================================
 * CATEGORY HEADER SECTION
 * =============================================================================
 * En-tête de la page catégorie avec bannière image et informations.
 * Composant serveur.
 */

import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { PRODUCT_PLACEHOLDER } from "@/lib/catalog/catalog-constants";
import type { CategoryInfo } from "@/lib/catalog/catalog-page-types";

interface CategoryHeaderSectionProps {
  readonly category: CategoryInfo;
  readonly totalCount: number;
}

/**
 * En-tête de catégorie avec bannière, titre, description et compteur de produits.
 */
export function CategoryHeaderSection({
  category,
  totalCount,
}: CategoryHeaderSectionProps) {
  const productWord = totalCount > 1 ? "produits disponibles" : "produit disponible";

  return (
    <header className="mb-12">
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 min-h-[200px] md:min-h-[280px] flex items-end">
        <ImageWithFallback
          src={category.imageUrl ?? PRODUCT_PLACEHOLDER}
          fallbackSrc={PRODUCT_PLACEHOLDER}
          alt={`Bannière ${category.name}`}
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="relative z-10 p-6 md:p-10 w-full">
          <h1 className="text-3xl md:text-5xl font-playfair font-bold text-white mb-2">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-slate-200 text-lg max-w-2xl">
              {category.description}
            </p>
          )}
          <p className="text-slate-300 text-sm mt-3">
            {totalCount} {productWord}
          </p>
        </div>
      </div>
    </header>
  );
}
