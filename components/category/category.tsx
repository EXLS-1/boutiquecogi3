/**
 * =============================================================================
 * CATEGORY SECTION - Organisme - Boutiquecogi3
 * =============================================================================
 * Section principale "Notre Boutique" avec grille complète.
 * Intègre Nouveautés, Promotions et catégories statiques.
 * Architecture évolutive : ajouter une catégorie = modifier les constantes.
 */

import { memo } from "react";
import { CategoryGrid } from "../catalog/catalog-grid";
import { NewProductCategory } from "./new-product";
import { SectionPromotion } from "./promotion-product";
import Femme from "./femme";
import Homme from "./homme";
import Enfant from "./enfant";
import Sac from "./sac";
import Chaussure from "./chaussure";
import Accessoire from "./accessoire";

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
        <CategoryGrid
          config={{
            columns: { mobile: 1, tablet: 2, desktop: 3 },
            gap: "2rem",
          }}
        >
          {/* Catégories promotionnelles (prioritaires) */}
          <NewProductCategory
            userRbacLevel={userRbacLevel}
            isAuthenticated={isAuthenticated}
          />
          <PromotionProductCategory
            userRbacLevel={userRbacLevel}
            isAuthenticated={isAuthenticated}
          />

          {/* Catégories statiques */}
          <Femme />
          <Homme />
          <Enfant />
          <Sac />
          <Chaussure />
          <Accessoire />
        </CategoryGrid>

      </div>
    </section>
  );
}

export default memo(CategorySectionComponent);