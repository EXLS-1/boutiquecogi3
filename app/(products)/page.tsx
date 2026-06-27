/**
 * =============================================================================
 * PRODUCTS PAGE - Boutiquecogi3 (Réécriture)
 * =============================================================================
 * Architecture : Page serveur (parse/validate) → Fetcher async (streaming)
 *                → ProductCatalog (client/render).
 *
 * Règles appliquées :
 * - Le fetch est DÉPLACÉ dans un composant async interne wrappé dans Suspense.
 *   Le skeleton s'affiche réellement pendant le chargement.
 * - Validation stricte : catégorie invalide → 404 (notFound).
 * - Métadonnées 100 % dynamiques (SEO par catégorie / recherche / page).
 * - Rétrocompatibilité avec les anciens params `sort` (price-asc, price-desc…)
 *   tout en supportant le nouveau système nuqs (`SortableField`).
 * - Gestion des erreurs de fetch avec fallback UI (pas de crash brut).
 * - `key` sur Suspense pour forcer le remount à chaque changement de filtre.
 */

import { Suspense } from "react";
// Avoid importing `Metadata` type from 'next' to prevent issues with
// local ambient declaration files (next.d.ts not being a module).
// Use a generic any for metadata to keep typing loose in this file.
import { notFound } from "next/navigation";
import { searchParamsCache } from "@/components/catalog/catalog-search-params";
import { searchCatalogProducts } from "@/lib/catalog/catalog-queries";
import ProductCatalog from "@/components/product/product-catalog";
import { ProductListSkeleton } from "@/components/catalog/product-list-skeleton";
import { SortableField, SORTABLE_FIELDS } from "@/lib/catalog/catalog-types";

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTES & TYPES
// ═════════════════════════════════════════════════════════════════════════════

const VALID_CATEGORIES = [
  "all",
  "femme",
  "homme",
  "enfant",
  "sac",
  "chaussure",
  "accessoire",
] as const;

type ValidCategory = (typeof VALID_CATEGORIES)[number];

const PAGE_SIZE = 12;

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ═════════════════════════════════════════════════════════════════════════════
// MÉTADONNÉES DYNAMIQUES
// ═════════════════════════════════════════════════════════════════════════════

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<any> {
  const raw = await searchParams;
  const parsed = searchParamsCache.parse(raw);

  const categoryLabel =
    parsed.category === "all"
      ? "Nos Produits"
      : parsed.category.charAt(0).toUpperCase() + parsed.category.slice(1);

  const searchSuffix = parsed.q ? ` — Recherche « ${parsed.q} »` : "";
  const pageSuffix = parsed.page > 1 ? ` — Page ${parsed.page}` : "";

  const title = `${categoryLabel}${searchSuffix}${pageSuffix} | Boutique COGI`;
  const description = `Découvrez notre collection ${categoryLabel.toLowerCase()}${searchSuffix} de vêtements et accessoires de qualité.`;

  return {
    title,
    description,
    robots: {
      // On noindex les pages de recherche et pagination profonde pour le SEO
      index: parsed.page === 1 && !parsed.q,
      follow: true,
    },
    openGraph: {
      title,
      description,
      type: "website",
    },
    alternates: {
      canonical:
        parsed.page === 1 && !parsed.q && parsed.category === "all"
          ? "/products"
          : undefined,
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

function validateCategory(category: string): asserts category is ValidCategory {
  if (!VALID_CATEGORIES.includes(category as ValidCategory)) {
    notFound();
  }
}

/**
 * Rétrocompatibilité + mapping vers le nouveau système nuqs.
 * Anciens formats supportés : price-asc, price-desc, name-asc, name-desc, newest.
 * Nouveaux formats : basePrice, name, createdAt, updatedAt + paramètre `order`.
 */
function buildSortConfig(
  sort: SortableField,
  rawOrder?: string | string[]
): { sortBy: SortableField; sortOrder: "asc" | "desc" } {
  // Fallback si order est passé manuellement dans l'URL (hors nuqs)
  const explicitOrder =
    typeof rawOrder === "string" && rawOrder === "desc" ? "desc" : "asc";

  // Ancien mapping (pour ne pas casser les URLs bookmarkées)
  const legacyMap: Record<string, { sortBy: SortableField; sortOrder: "asc" | "desc" }> = {
    newest: { sortBy: "createdAt", sortOrder: "desc" },
    "price-asc": { sortBy: "basePrice", sortOrder: "asc" },
    "price-desc": { sortBy: "basePrice", sortOrder: "desc" },
    "name-asc": { sortBy: "name", sortOrder: "asc" },
    "name-desc": { sortBy: "name", sortOrder: "desc" },
  };

  if (sort in legacyMap) {
    return legacyMap[sort];
  }

  // Nouveau système : le champ est directement un SortableField
  // Par défaut createdAt → desc (plus récent d'abord), le reste → asc
  const defaultOrder: Record<SortableField, "asc" | "desc"> = {
    createdAt: "desc",
    updatedAt: "desc",
    basePrice: "asc",
    name: "asc",
  };

  return {
    sortBy: SORTABLE_FIELDS.includes(sort) ? sort : "createdAt",
    sortOrder: explicitOrder || defaultOrder[sort] || "asc",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═════════════════════════════════════════════════════════════════════════════

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const raw = await searchParams;

  // 1. Parsing type-safe via nuqs
  const parsed = searchParamsCache.parse(raw);

  // 2. Validation métier
  validateCategory(parsed.category);

  // 3. Validation logique prix (swap si inversé)
  let minPrice = parsed.minPrice > 0 ? parsed.minPrice : undefined;
  let maxPrice = parsed.maxPrice < 1_000_000_000 ? parsed.maxPrice : undefined;
  if (minPrice && maxPrice && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice]; // Correction silencieuse
  }

  // 4. Clamping page (minimum 1)
  const page = Math.max(1, parsed.page);

  // 5. Configuration de tri
  const { sortBy, sortOrder } = buildSortConfig(
    parsed.sort,
    raw.order
  );

  // 6. Clé de Suspense = forcer le remount à chaque changement de filtre
  //    (évite les états fantômes pendant la transition)
  const suspenseKey = `${parsed.category}-${parsed.sort}-${page}-${parsed.q}-${minPrice}-${maxPrice}`;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Suspense
          fallback={<ProductListSkeleton count={PAGE_SIZE} />}
          key={suspenseKey}
        >
          <ProductCatalogFetcher
            q={parsed.q}
            page={page}
            category={parsed.category}
            sortBy={sortBy}
            sortOrder={sortOrder}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />
        </Suspense>
      </div>
    </main>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FETCHER ASYNC (STREAMING)
// =============================================================================
// Ce composant est wrappé dans Suspense : il peut être "en attente" côté serveur
// sans bloquer le shell HTML. Le skeleton s'affiche réellement.
// ═════════════════════════════════════════════════════════════════════════════

interface FetcherProps {
  q: string;
  page: number;
  category: ValidCategory;
  sortBy: SortableField;
  sortOrder: "asc" | "desc";
  minPrice?: number;
  maxPrice?: number;
}

async function ProductCatalogFetcher({
  q,
  page,
  category,
  sortBy,
  sortOrder,
  minPrice,
  maxPrice,
}: FetcherProps) {
  try {
    const { products, totalCount } = await searchCatalogProducts({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      categorySlug: category === "all" ? undefined : category,
      searchQuery: q || undefined,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
    });

    // Titre dynamique selon le contexte
    const title =
      category === "all"
        ? "Nos Produits"
        : category.charAt(0).toUpperCase() + category.slice(1);

    return (
      <ProductCatalog
        products={products}
        totalCount={totalCount}
        categories={[...VALID_CATEGORIES]}
        title={title}
        pageSize={PAGE_SIZE}
      />
    );
  } catch (error) {
    // En production : envoyer vers votre système de logs (Sentry, etc.)
    console.error("[ProductCatalogFetcher] Erreur de chargement:", error);

    return (
      <div className="text-center py-20 md:py-32">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <span className="text-2xl" aria-hidden="true">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Impossible de charger les produits
        </h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          Une erreur est survenue lors du chargement du catalogue. Veuillez
          rafraîchir la page ou réessayer plus tard.
        </p>
        <a
          href="/products"
          className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
          Réessayer
        </a>
      </div>
    );
  }
}