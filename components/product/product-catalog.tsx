// components/product/product-catalog.tsx

import { Product } from "@/types/products";
import { ProductList } from "@/components/product/product-list";
import { ProductSortFilter } from "@/components/product/product-sort-filter";
// Assure-toi que CategoryFilter pilote aussi l'URL via useRouter
import { CategoryFilter } from "@/components/category/category-filter"; 

interface CatalogProps {
  products: Product[];
  totalCount: number;
  categories: string[];
  title: string;
}

// Ce composant peut (et devrait) être un Server Component désormais, 
// car l'interactivité est reléguée aux composants enfants.
export default function ProductCatalog({ products, totalCount, categories, title }: CatalogProps) {
  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="space-y-8 mb-10">
          <h2 className="text-3xl font-playfair font-bold uppercase text-foreground">
            {title}
          </h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-y border-border py-4 bg-muted/10">
            {/* CategoryFilter doit être mis à jour pour lire/écrire dans les searchParams */}
            <CategoryFilter categories={categories} />
            <ProductSortFilter />
          </div>
        </header>

        <ProductList 
          products={products} 
          totalCount={totalCount} 
        />
      </div>
    </section>
  );
}