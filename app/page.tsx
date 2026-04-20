// app/page.tsx
import { Hero } from "@/components/hero";
import Boutique from "@/components/boutique";
import ProductCatalog from "@/components/product-catalog";
import { getAllProducts } from "@/lib/products";

export default async function Home() {
  // Récupération des données côté serveur (optimisé)
  const products = await getAllProducts();

  return (
    <>
      <Hero />
      <Boutique />
      <ProductCatalog
        title="Nos dernières nouveautés"
        products={products}
      />
    </>
  );
}