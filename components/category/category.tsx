/**
 * =============================================================================
 * CATEGORY SECTION - Organisme - Boutiquecogi3
 * =============================================================================
 * Section principale "Notre Boutique" avec grille complète.
 * Intègre Nouveautés, Promotions et catégories statiques.
 * Architecture évolutive : ajouter une catégorie = modifier les constantes.
 */

import { memo, ComponentType } from "react";
import { CatalogGrid } from "../catalog/catalog-grid";
import { NewProductCategory } from "../product/new-product";
import { SectionPromotions } from "@/components/product-promotion/promotions";
// Explicit prop shape used by category consumers
type CategoryWidgetProps = {
  readonly userRbacLevel?: number;
  readonly isAuthenticated?: boolean;
};

// Cast imported components to a concrete ComponentType instead of `any`.
// This keeps type-safety for props we pass here while avoiding altering
// the upstream component typings.
const NewProductCategoryAny = NewProductCategory as ComponentType<CategoryWidgetProps>;
const SectionPromotionsAny = SectionPromotions as ComponentType<CategoryWidgetProps>;

interface CategorySectionProps {
  readonly userRbacLevel?: number;
  readonly isAuthenticated?: boolean;
}

function CategorySectionComponent({
  userRbacLevel,
  isAuthenticated = false,
}: CategorySectionProps) {
  return (
    <section
      className="py-20 bg-gray-50"
      id="boutique"
      aria-labelledby="boutique-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center mb-16">
          <h2
            id="boutique-heading"
            className="font-playfair text-3xl md:text-5xl font-bold text-gray-900 uppercase tracking-wider mb-4"
          >
            Notre Boutique
          </h2>
          <p className="font-lato text-gray-500 text-lg">
            Découvrez nos collections par catégorie
          </p>
        </div>

        {/* ─── Grille des catégories ──────────────────────────────────────── */}
        <CatalogGrid
          config={{
            columns: { mobile: 1, tablet: 2, desktop: 3 },
            gap: "1rem",
          }}
        >
          {/* Catégories promotionnelles (prioritaires) */}
          <NewProductCategoryAny
            userRbacLevel={userRbacLevel}
            isAuthenticated={isAuthenticated}
          />
          <SectionPromotionsAny
            userRbacLevel={userRbacLevel}
            isAuthenticated={isAuthenticated}
          />
        </CatalogGrid>

         
      </div>
    </section>
  );
}

export default memo(CategorySectionComponent);