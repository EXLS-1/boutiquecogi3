// app/promotions/page.tsx
/**
 * =============================================================================
 * PAGE PROMOTIONS — Boutiquecogi3
 * =============================================================================
 * Liste des produits en promotion, réutilisant la logique métier de
 * components/product-promotion/promotions.tsx (getPromotionalProducts).
 */

import { SectionPromotions } from "@/components/product-promotion/promotions";

export const revalidate = 180; // CACHE_DURATIONS.PROMOTIONS

export const metadata = {
  title: "Promotions | Boutique COGI",
  description:
    "Découvrez tous nos produits en promotion : profitez de nos meilleures offres.",
};

export default function PromotionsPage() {
  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      <SectionPromotions />
    </main>
  );
}