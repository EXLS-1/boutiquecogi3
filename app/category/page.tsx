// app/category/page.tsx
import { Metadata } from "next";
import Category from "@/components/category/category";
import { getAllProducts } from "@/lib/products";
import { CurrencyCode } from "@/lib/currency/format-currency";
import ProductCatalog from "@/components/product/product-catalog";
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: "CatéSgories | Boutique COGI3",
  description: "Parcourez nos différentes catégories de mode : Femme, Homme, Enfant, Sacs et Accessoires.",
};

export default async function CategoryIndexPage() {
  const cookieStore = await cookies();
    // On lit la devise depuis les cookies, avec 'USD' en valeur de repli par défaut
    const preferredCurrency = cookieStore.get('user-currency')?.value as CurrencyCode || 'USD';
  
    // Fetch de tes produits...
    // Récupération des données côté serveur
    const products = await getAllProducts();
  return (
    <main className="container mx-auto px-4 py-12">
      <Category />
      <ProductCatalog
              title="Nos récentes nouveautés"
              products={products}
              activeCurrency={preferredCurrency}
            />
    </main>
  );
}