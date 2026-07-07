/**
 * =============================================================================
 * CATEGORY SECTION - Organisme - Boutiquecogi3
 * =============================================================================
 * Section principale "Notre Boutique" avec grille complète.
 * Intègre Nouveautés, Promotions et catégories statiques.
 * Architecture évolutive : ajouter une catégorie = modifier les constantes.
 */

import { memo, ComponentType } from "react";
import { CatalogGrid } from "./catalog-grid";
import { NewProductCategory } from "@/components/product-recent/product-recent";
import { SectionPromotions } from "@/components/product-promotion/promotions";
// Explicit prop shape used by category consumers
type CatalogWidgetProps = {
  readonly userRbacLevel?: number;
  readonly isAuthenticated?: boolean;
};

// Cast imported components to a concrete ComponentType instead of `any`.
// This keeps type-safety for props we pass here while avoiding altering
// the upstream component typings.
const NewProductCategoryAny = NewProductCategory as ComponentType<CatalogWidgetProps>;
const SectionPromotionsAny = SectionPromotions as ComponentType<CatalogWidgetProps>;

interface CatalogSectionProps {
  readonly userRbacLevel?: number;
  readonly isAuthenticated?: boolean;
}

function CatalogSectionComponent({
  userRbacLevel,
  isAuthenticated = false,
}: CatalogSectionProps) {
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
            className="font-playfair text-5xl md:text-5xl font-bold text-pink-500 uppercase tracking-wider mb-4"
          >
            Notre Boutique
          </h2>
          <p className="font-lato text-pink-500 text-lg">
            Faites la découverte des articles dans notre catalogue
          </p>
        </div>

        {/* ─── CAtalog ──────────────────────────────────────── */}
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

export default memo(CatalogSectionComponent);