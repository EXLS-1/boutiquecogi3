/**
 * =============================================================================
 * BOUTIQUE FEMME - Boutiquecogi3
 * =============================================================================
 */

import { memo } from "react";
import { CategoryCard } from "./category-card";
import { STATIC_CATEGORIES } from "@/lib/category/category-constants";

function BoutiqueFemmeComponent() {
  const category = STATIC_CATEGORIES.find((c) => c.slug === "femme");
  if (!category) return null;

  return (
    <CategoryCard
      title={category.title}
      subtitle={category.subtitle}
      imageSrc={category.imageSrc}
      imageAlt={category.imageAlt}
      href={category.href}
    />
  );
}

export default memo(BoutiqueFemmeComponent);