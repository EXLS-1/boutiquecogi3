import Hero from "@/components/hero";
import Boutique from "@/components/boutique";
import ProductCatalog from "@/components/product-catalog";
import { getAllProducts } from "@/lib/products";

export const revalidate = 60; // ISR toutes les 60 secondes

export default async function Home() {
  const products = await getAllProducts();

  return (
    <body>
      <Hero />
      <Boutique />
      <ProductCatalog
        title="Nos dernières nouveautés"
        products={products}
      />
      
    </body>
  );
}
