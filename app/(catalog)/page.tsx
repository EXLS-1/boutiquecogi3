/**
 * =============================================================================
 * CATALOG INDEX PAGE - Boutiquecogi3
 * =============================================================================
 * Page d'accueil des catalogues avec ISR, streaming, gestion d'erreurs,
 * parallélisation des requêtes, métadonnées dynamiques, fallback RBAC,
 * loading sophistiqué et fallback images.
 */

import { Suspense } from "react";
import { Metadata, ResolvingMetadata } from "next";
import Category from "@/components/category/category";
import { ProductList } from "@/components/catalog/product-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { PackageSearch, AlertTriangle } from "lucide-react";
import {
  HOME_PRODUCTS_LIMIT,
} from "@/lib/catalog/catalog-constants";
import {
  getRecentProducts,
  getFeaturedProducts,
  getCatalogCategories,
} from "@/lib/catalog/catalog-queries";
import {
  mapCatalogProduct,
  mapCatalogProducts,
} from "@/lib/catalog/catalog-mappers";
import { RBAC_LEVELS, type RbacLevel } from "@/lib/category/category-types";

// ─── Types ──────────────────────────────────────────────────────────────────
type Product = ReturnType<typeof mapCatalogProduct>;
type CatalogProduct = Product;

interface CatalogCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly imageUrl: string | null;
}

interface CatalogData {
  readonly recentProducts: readonly CatalogProduct[];
  readonly featuredProducts: readonly CatalogProduct[];
  readonly categories: readonly CatalogCategory[];
  readonly fetchError: Error | null;
  readonly partialErrors: readonly PartialError[];
}

interface PartialError {
  readonly source: string;
  readonly message: string;
}

interface RbacContext {
  readonly level: RbacLevel;
  readonly isAuthenticated: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const FALLBACK_RBAC: RbacContext = {
  level: RBAC_LEVELS.GUEST,
  isAuthenticated: false,
};

const OG_IMAGE_DIMENSIONS = { width: 1200, height: 630 } as const;

// ─── Métadonnées Dynamiques ─────────────────────────────────────────────────
export const revalidate = 300; // ISR 5 minutes

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const [catalogStats, parentMetadata] = await Promise.all([
    getCatalogStatsForMetadata().catch(() => null),
    parent,
  ]);

  const previousImages = parentMetadata.openGraph?.images || [];

  return {
    title: {
      default: "Catalogue des Produits | Boutique COGI",
      template: "%s | Boutique COGI",
    },
    description:
      catalogStats?.description ??
      "Parcourez nos différents catalogues de produits parcourant chaque mode: Mode femme, homme, enfant, accessoires et plus encore.",
    keywords: [
      "mode",
      "femme",
      "homme",
      "enfant",
      "accessoires",
      "boutique",
      "cogi",
      ...(catalogStats?.topCategories ?? []),
    ],
    openGraph: {
      title: "Catalogue | Boutique COGI",
      description:
        catalogStats?.description ??
        "Découvrez toutes nos collections",
      type: "website",
      siteName: "Boutique COGI",
      locale: "fr_FR",
      images: [
        {
          url: "/og/catalog-default.jpg",
          width: OG_IMAGE_DIMENSIONS.width,
          height: OG_IMAGE_DIMENSIONS.height,
          alt: "Catalogue Boutique COGI",
        },
        ...previousImages,
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Catalogue | Boutique COGI",
      description:
        catalogStats?.description ??
        "Découvrez toutes nos collections",
      images: ["/og/catalog-default.jpg"],
    },
    alternates: {
      canonical: "/catalogue",
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

// ─── Fonction de récupération centralisée (Promise.all) ──────────────────────
async function fetchCatalogData(): Promise<CatalogData> {
  const partialErrors: PartialError[] = [];

  // Parallélisation des 3 requêtes indépendantes avec gestion granulaire d'erreurs
  const [recentProductsRaw, featuredProductsRaw, categoriesRaw] = await Promise.all([
    getRecentProducts(HOME_PRODUCTS_LIMIT)
      .catch((err: unknown) => {
        partialErrors.push({
          source: "recentProducts",
          message: err instanceof Error ? err.message : "Erreur récupération nouveautés",
        });
        return [] as readonly CatalogProduct[];
      }),

    getFeaturedProducts(6)
      .catch((err: unknown) => {
        partialErrors.push({
          source: "featuredProducts",
          message: err instanceof Error ? err.message : "Erreur récupération produits en vedette",
        });
        return [] as readonly CatalogProduct[];
      }),

    getCatalogCategories()
      .catch((err: unknown) => {
        partialErrors.push({
          source: "categories",
          message: err instanceof Error ? err.message : "Erreur récupération catégories",
        });
        return [] as readonly CatalogCategory[];
      }),
  ]);

  // Mapping déjà effectué par les queries — les tableaux sont déjà readonly
  const recentProducts = recentProductsRaw;
  const featuredProducts = featuredProductsRaw;

  // Détermination de l'erreur globale : échec si aucune donnée n'est disponible
  const fetchError =
    recentProducts.length === 0 && featuredProducts.length === 0 && categoriesRaw.length === 0
      ? new Error(
          `Échec total du chargement du catalogue. Erreurs: ${partialErrors
            .map((e) => `[${e.source}] ${e.message}`)
            .join("; ")}`
        )
      : null;

  if (partialErrors.length > 0 && !fetchError) {
    console.warn("[CatalogIndexPage] Erreurs partielles:", partialErrors);
  }

  return {
    recentProducts,
    featuredProducts,
    categories: categoriesRaw,
    fetchError,
    partialErrors: Object.freeze(partialErrors),
  };
}

// ─── Fallback RBAC ──────────────────────────────────────────────────────────
function resolveRbacContext(): RbacContext {
  try {
    // TODO: Remplacer par l'intégration réelle Better-Auth / middleware
    // const session = await auth(); // Ex: Better-Auth
    // const userRbacLevel = session?.user?.rbacLevel ?? RBAC_LEVELS.GUEST;
    // const isAuthenticated = !!session?.user;

    return FALLBACK_RBAC;
  } catch (error) {
    console.error("[CatalogIndexPage] Erreur résolution RBAC, fallback GUEST:", error);
    return FALLBACK_RBAC;
  }
}

// ─── Données pour les métadonnées ───────────────────────────────────────────
async function getCatalogStatsForMetadata(): Promise<{
  description: string;
  topCategories: string[];
} | null> {
  try {
    const categories = await getCatalogCategories();
    const topCategories = categories
      .slice(0, 5)
      .map((c: CatalogCategory) => c.name.toLowerCase());

    return {
      description: `Découvrez ${categories.length} catégories de mode : ${topCategories.join(", ")} et bien plus encore.`,
      topCategories,
    };
  } catch {
    return null;
  }
}

// ─── Page Principale ─────────────────────────────────────────────────────────
export default async function CatalogIndexPage() {
  const [catalogData, rbacContext] = await Promise.all([
    fetchCatalogData(),
    Promise.resolve().then(resolveRbacContext),
  ]);

  const { recentProducts, featuredProducts, categories, fetchError, partialErrors } = catalogData;
  const { level: userRbacLevel, isAuthenticated } = rbacContext;

  const hasPartialError = partialErrors.length > 0;

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      
      {/* ─── Section Catégories ───────────────────────────────────────────── */}
      <Category
        userRbacLevel={userRbacLevel}
        isAuthenticated={isAuthenticated}
        categories={categories}
      />

      {/* ─── Alertes partielles ──────────────────────────────────────────── */}
      {hasPartialError && (
        <PartialErrorBanner errors={partialErrors} />
      )}

      {/* ─── Section Produits en Vedette ─────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="mt-16" aria-labelledby="featured-heading">
          <div className="flex flex-col items-center justify-center space-y-4 mb-12">
            <h2
              id="featured-heading"
              className="text-3xl md:text-4xl font-playfair font-bold uppercase text-center text-slate-900"
            >
              Nos coups de cœur
            </h2>
            <div className="w-24 h-1 bg-cyan-600 rounded-full" aria-hidden="true" />
          </div>

          <Suspense fallback={<ProductListLoadingSkeleton count={6} />}>
            <ProductList
              products={featuredProducts}
              totalCount={featuredProducts.length}
              pageSize={6}
            />
          </Suspense>
        </section>
      )}

      {/* ─── Section Nouveautés ──────────────────────────────────────────── */}
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

        <Suspense fallback={<ProductListLoadingSkeleton count={HOME_PRODUCTS_LIMIT} />}>
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

      {/* ─── Section Image de confiance (démo fallback) ──────────────────── */}
      <section className="mt-24" aria-labelledby="trust-heading">
        <div className="flex flex-col items-center justify-center space-y-4 mb-12">
          <h2
            id="trust-heading"
            className="text-3xl md:text-4xl font-playfair font-bold uppercase text-center text-slate-900"
          >
            Nos engagements
          </h2>
          <div className="w-24 h-1 bg-cyan-600 rounded-full" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TrustCard
            imageSrc="/images/trust-quality.jpg"
            fallbackSrc="/images/placeholder-trust.jpg"
            title="Qualité garantie"
            description="Tous nos produits sont sélectionnés avec soin."
          />
          <TrustCard
            imageSrc="/images/trust-delivery.jpg"
            fallbackSrc="/images/placeholder-trust.jpg"
            title="Livraison rapide"
            description="Livraison en 24-48h sur toute la Côte d'Ivoire."
          />
          <TrustCard
            imageSrc="/images/trust-support.jpg"
            fallbackSrc="/images/placeholder-trust.jpg"
            title="Support client"
            description="Une équipe à votre écoute 7j/7."
          />
        </div>
      </section>

    </main>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

/**
 * Composant de loading sophistiqué avec animation pulse et structure réaliste
 */
function ProductListLoadingSkeleton({ count }: { readonly count: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      aria-label="Chargement des produits"
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse"
        >
          {/* Image skeleton avec aspect ratio réaliste */}
          <div className="relative w-full aspect-[4/5] rounded-lg mb-4 bg-slate-200 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
            <div className="absolute top-2 right-2 w-10 h-6 rounded bg-slate-300/50" />
          </div>
          
          {/* Badge skeleton */}
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-16 rounded-full bg-slate-200" />
            <div className="h-5 w-12 rounded-full bg-slate-200" />
          </div>
          
          {/* Title skeleton */}
          <div className="h-6 rounded bg-slate-200 w-3/4 mb-2" />
          
          {/* Price skeleton */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 rounded bg-slate-200 w-20" />
            <div className="h-4 rounded bg-slate-200 w-14" />
          </div>
          
          {/* Rating skeleton */}
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 w-4 rounded-full bg-slate-200" />
            ))}
            <div className="h-4 rounded bg-slate-200 w-8 ml-1" />
          </div>
          
          {/* Button skeleton */}
          <div className="h-10 rounded-lg bg-slate-200 w-full" />
        </div>
      ))}
      <span className="sr-only">Chargement des produits en cours...</span>
    </div>
  );
}

/**
 * Carte de confiance avec fallback image intégré
 */
function TrustCard({
  imageSrc,
  fallbackSrc,
  title,
  description,
}: {
  readonly imageSrc: string;
  readonly fallbackSrc: string;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <ImageWithFallback
        src={imageSrc}
        fallbackSrc={fallbackSrc}
        alt={title}
        width={400}
        height={250}
        className="w-full h-48 object-cover rounded-lg mb-4"
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PC9zdmc+"
      />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}

/**
 * Bannière d'erreurs partielles (non bloquante)
 */
function PartialErrorBanner({ errors }: { readonly errors: readonly PartialError[] }) {
  return (
    <div
      className="mt-8 p-4 border border-amber-200 bg-amber-50 rounded-xl flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div>
        <p className="text-amber-800 font-medium text-sm">
          Certaines données n&apos;ont pas pu être chargées
        </p>
        <ul className="mt-1 text-amber-700 text-xs space-y-0.5">
          {errors.map((err, i) => (
            <li key={i}>• {err.source}: {err.message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EmptyState({ message }: { readonly message: string }) {
  return (
    <div className="text-center py-16">
      <PackageSearch className="h-12 w-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
      <p className="text-slate-500 text-lg">{message}</p>
    </div>
  );
}

function ErrorState({ message }: { readonly message: string }) {
  return (
    <div className="text-center py-16 border border-red-200 bg-red-50 rounded-xl">
      <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-4" aria-hidden="true" />
      <p className="text-red-600 text-lg font-medium">{message}</p>
      <p className="text-red-400 text-sm mt-2">
        Si le problème persiste, contactez notre support.
      </p>
    </div>
  );
}