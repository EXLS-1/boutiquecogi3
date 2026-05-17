// app/page.tsx
import { cookies } from 'next/headers';
import { Hero } from "@/components/hero";
import Boutique from "@/components/category/boutique";
import ProductCatalog from "@/components/product/product-catalog";
import { getAllProducts } from "@/lib/products";
import { CurrencyCode } from "@/lib/format-currency";

export default async function Home() {
  const cookieStore = await cookies();
  // On lit la devise depuis les cookies, avec 'USD' en valeur de repli par défaut
  const preferredCurrency = cookieStore.get('user-currency')?.value as CurrencyCode || 'USD';

  // Fetch de tes produits...
  // Récupération des données côté serveur
  const products = await getAllProducts();

  return (
    <>
      <Hero />
      <Boutique />
      <ProductCatalog
        title="Nos récentes nouveautés"
        products={products}
        activeCurrency={preferredCurrency}
      />
     
    </>
  );
}