/**
 * =============================================================================
 * CATEGORY INDEX PAGE - Boutiquecogi3
 * =============================================================================
 * Page d'accueil des catégories avec ISR, streaming, et gestion d'erreurs.
 */

import { Suspense } from "react";
import { Metadata } from "next";
import Category from "@/components/category/category";
import { ProductList } from "@/components/product/product-list";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HOME_PRODUCTS_LIMIT,
} from "@/lib/catalog/catalog-constants";
import {
  getRecentProducts,
} from "@/lib/catalog/catalog-queries";
import {
  mapCatalogProduct,
} from "@/lib/catalog/catalog-mappers";
import { RBAC_LEVELS } from "@/lib/category/category-types";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Product {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly price: number;
  readonly imageUrl: string;
  readonly isAvailable: boolean;
}

// ─── Métadonnées ────────────────────────────────────────────────────────────
export const revalidate = 300; // ISR 5 minutes

export const metadata: Metadata = {
  title: "Catégories | Boutique COGI",
  description: "Parcourez nos différentes catégories de produits. Mode femme, homme, enfant, accessoires et plus encore.",
  openGraph: {
    title: "Catégories | Boutique COGI",
    description: "Découvrez toutes nos collections",
    type: "website",
  },
};

// ─── Page Principale ────────────────────────────────────────────────────────
export default async function CategoryIndexPage() {
  // Récupération des produits récents avec gestion d'erreurs atomique
  let recentProducts: Product[] = [];
  let fetchError: Error | null = null;

  try {
    const products = await getRecentProducts(HOME_PRODUCTS_LIMIT);
    recentProducts = products.map(mapCatalogProduct);
  } catch (error) {
    fetchError = error instanceof Error ? error : new Error("Erreur inconnue");
    console.error("[CategoryPage] Erreur récupération produits:", fetchError.message);
  }

  // TODO: Récupérer depuis le middleware/session Better-Auth
  const userRbacLevel = RBAC_LEVELS.GUEST;
  const isAuthenticated = false;

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      
      {/* ─── Section Catégories ───────────────────────────────────────────── */}
      <Category 
        userRbacLevel={userRbacLevel} 
        isAuthenticated={isAuthenticated} 
      />

      {/* ─── Section Nouveautés ───────────────────────────────────────────── */}
      <section className="mt-24" aria-labelledby="nouveautes-heading">
        <div className="flex flex-col items-center justify-center space-y-4 mb-12">
          <h2 
            id="nouveautes-heading"
            className="text-3xl md:text-4xl font-playfair font-bold uppercase text-center text-slate-900"
          >
            Nos récentes nouveautés
          </h2>
          <div className="w-24 h-1 bg-cyan-600 rounded-full" aria-hidden="true" />
        </div>

        <Suspense fallback={<ProductListLoading />}>
          {fetchError ? (
            <ErrorState message="Impossible de charger les produits. Veuillez réessayer." />
          ) : recentProducts.length === 0 ? (
            <EmptyState message="Aucun produit récent disponible pour le moment." />
          ) : (
            <ProductList
              products={recentProducts}
              totalCount={recentProducts.length}
              pageSize={HOME_PRODUCTS_LIMIT}
            />
          )}
        </Suspense>
      </section>

    </main>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function ProductListLoading() {
  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      aria-label="Chargement des produits"
    >
      {Array.from({ length: HOME_PRODUCTS_LIMIT }).map((_, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-4 shadow-sm">
          <Skeleton className="w-full h-48 rounded-lg mb-4" />
          <Skeleton className="h-6 rounded w-3/4 mb-2" />
          <Skeleton className="h-4 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { readonly message: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-slate-500 text-lg">{message}</p>
    </div>
  );
}

function ErrorState({ message }: { readonly message: string }) {
  return (
    <div className="text-center py-16 border border-red-200 bg-red-50 rounded-xl">
      <p className="text-red-600 text-lg font-medium">{message}</p>
    </div>
  );
}