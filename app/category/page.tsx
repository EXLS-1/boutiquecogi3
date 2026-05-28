// app/category/page.tsx
import { Metadata } from "next";
import { CategoryCard } from "@/components/category/category-card";


export const metadata: Metadata = {
  title: "CatéSgories | Boutique COGI3",
  description: "Parcourez nos différentes catégories de mode : Femme, Homme, Enfant, Sacs et Accessoires.",
};

export default function CategoryIndexPage() {
  return (
    <main className="container mx-auto px-4 py-12">
      <CategoryCard />
    </main>
  );
}