/**
 * =============================================================================
 * PROMOTION PRODUCT CATEGORY - Boutiquecogi3
 * =============================================================================
 * Composant dédié à l'affichage de la catégorie "Promotions".
 * Badge "Promo" avec style distinctif (rouge/déstructif).
 */

"use client";

import { memo } from "react";
import { Percent } from "lucide-react";
import { CategoryCard } from "./category-card";
import { PROMOTIONAL_CATEGORIES } from "@/lib/category/category-constants";
import { useFilteredCategories, type RbacLevel } from "@/hooks/category/use-category-permissions";

interface PromotionProductCategoryProps {
  readonly userRbacLevel?: RbacLevel;
  readonly isAuthenticated: boolean;
}

function PromotionProductCategoryComponent({
  userRbacLevel,
  isAuthenticated,
}: PromotionProductCategoryProps) {
  const visibleCategories = useFilteredCategories(
    PROMOTIONAL_CATEGORIES,
    { userRbacLevel, isAuthenticated }
  );

  if (visibleCategories.length === 0) return null;

  const category = visibleCategories[0];

  return (
    <CategoryCard
      title={category.title}
      subtitle={category.subtitle}
      imageSrc={category.imageSrc}
      imageAlt={category.imageAlt}
      href={category.href}
      badge="-30%"
      badgeVariant="destructive"
      priority={false}
      aspectRatio="16/9"
      className="border-rose-200 hover:border-rose-400/50"
    />

  );
}

export const PromotionProductCategory = memo(PromotionProductCategoryComponent);
PromotionProductCategory.displayName = "PromotionProductCategory";