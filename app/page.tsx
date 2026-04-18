
import { Hero } from "@/components/hero";
import Boutique from "@/components/boutique";
import ProductCatalog from "@/components/product-catalog";


export default function Home() {
  return (
    <main>
      <body>
        <Hero />
        <Boutique />
        <ProductCatalog
          title="Nos dernières nouveautés"
          products={products}
        />
      </body>
    </main>
  );
}
