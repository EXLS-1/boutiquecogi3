// Le fichier app/page.tsx est le point d'entrée de la page d'accueil de l'application Next.js. Il utilise des composants pour afficher le contenu de la page, notamment un composant Hero pour la section principale, un composant Boutique pour les catégories de produits, et un composant ProductCatalog pour afficher les produits récents. Le code récupère également les préférences de devise de l'utilisateur à partir des cookies et les utilise pour afficher les prix dans la devise préférée. Les données des produits sont récupérées côté serveur à l'aide d'une fonction asynchrone getAllProducts.
// app/page.tsx
import { cookies } from 'next/headers';
import { Hero } from "@/components/hero/hero";
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