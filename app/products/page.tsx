// app/products/page.tsx
/**
 * =============================================================================
 * PRODUCTS PAGE - Boutiquecogi3 (RÃ©Ã©criture)
 * =============================================================================
 * Architecture : Page serveur (parse/validate) â†’ Fetcher async (streaming)
 *                â†’ ProductCatalog (client/render).
 *
 * RÃ¨gles appliquÃ©es :
 * - Le fetch est DÃ‰PLACÃ‰ dans un composant async interne wrappÃ© dans Suspense.
 *   Le skeleton s'affiche rÃ©ellement pendant le chargement.
 * - Validation stricte : catÃ©gorie invalide â†’ 404 (notFound).
 * - MÃ©tadonnÃ©es 100 % dynamiques (SEO par catÃ©gorie / recherche / page).
 * - RÃ©trocompatibilitÃ© avec les anciens params `sort` (price-asc, price-descâ€¦)
 *   tout en supportant le nouveau systÃ¨me nuqs (`SortableField`).
 * - Gestion des erreurs de fetch avec fallback UI (pas de crash brut).
 * - `key` sur Suspense pour forcer le remount Ã  chaque changement de filtre.
 */

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { searchParamsCache } from "@/components/product-catalog/catalog-search-params";
import { searchCatalogProducts } from "@/lib/product-catalog/catalog-queries";
import { ProductListSkeleton } from "@/components/product/product-list-skeleton";
import { ProductList } from "@/components/product/product-list";
import { ProductVariantCatalogSummary } from "@/components/product/product-variant";
import { SortableField, SORTABLE_FIELDS } from "@/lib/product-catalog/catalog-types";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONSTANTES & TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

interface ProductsPageMetadata {
  title: string;
  description: string;
  robots: {
    index: boolean;
    follow: boolean;
  };
  openGraph: {
    title: string;
    description: string;
    type: "website";
  };
  alternates: {
    canonical?: string;
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MÃ‰TADONNÃ‰ES DYNAMIQUES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<ProductsPageMetadata> {
  const raw = await searchParams;
  const parsed = searchParamsCache.parse(raw);

  const categoryLabel =
    parsed.category === "all"
      ? "Nos Produits"
      : parsed.category.charAt(0).toUpperCase() + parsed.category.slice(1);

  const searchSuffix = parsed.q ? ` â€” Recherche Â« ${parsed.q} Â»` : "";
  const pageSuffix = parsed.page > 1 ? ` â€” Page ${parsed.page}` : "";

  const title = `${categoryLabel}${searchSuffix}${pageSuffix} | Boutique COGI`;
  const description = `DÃ©couvrez notre collection ${categoryLabel.toLowerCase()}${searchSuffix} de vÃªtements et accessoires de qualitÃ©.`;

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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VALIDATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function validateCategory(category: string): asserts category is ValidCategory {
  if (!VALID_CATEGORIES.includes(category as ValidCategory)) {
    notFound();
  }
}

function buildSortConfig(
  sort: string | undefined,
  explicitOrder: string | string[] | undefined
): { sortBy: SortableField; sortOrder: "asc" | "desc" } {
  // Nouveau systÃ¨me : le champ est directement un SortableField
  // Par dÃ©faut createdAt â†’ desc (plus rÃ©cent d'abord), le reste â†’ asc
  const defaultOrder: Record<SortableField, "asc" | "desc"> = {
    createdAt: "desc",
    updatedAt: "desc",
    basePrice: "asc",
    name: "asc",
  };

  const normalizedOrder = Array.isArray(explicitOrder)
    ? explicitOrder[0]
    : explicitOrder;

  const sortBy = SORTABLE_FIELDS.includes(sort as SortableField)
    ? (sort as SortableField)
    : "createdAt";

  const sortOrder =
    normalizedOrder === "asc" || normalizedOrder === "desc"
      ? normalizedOrder
      : defaultOrder[sortBy] || "asc";

  return {
    sortBy,
    sortOrder,
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAGE PRINCIPALE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const raw = await searchParams;

  // 1. Parsing type-safe via nuqs
  const parsed = searchParamsCache.parse(raw);

  // 2. Validation mÃ©tier
  validateCategory(parsed.category);

  // 3. Validation logique prix (swap si inversÃ©)
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

  // 6. ClÃ© de Suspense = forcer le remount Ã  chaque changement de filtre
  //    (Ã©vite les Ã©tats fantÃ´mes pendant la transition)
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FETCHER ASYNC (STREAMING)
// =============================================================================
// Ce composant est wrappÃ© dans Suspense : il peut Ãªtre "en attente" cÃ´tÃ© serveur
// sans bloquer le shell HTML. Le skeleton s'affiche rÃ©ellement.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
  let products: Awaited<ReturnType<typeof searchCatalogProducts>>["products"];
  let totalCount: Awaited<ReturnType<typeof searchCatalogProducts>>["totalCount"];
  let hasError = false;

  try {
    const result = await searchCatalogProducts({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      categorySlug: category === "all" ? undefined : category,
      searchQuery: q || undefined,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
    });

    products = result.products;
    totalCount = result.totalCount;
  } catch (error) {
    // En production : envoyer vers votre systÃ¨me de logs (Sentry, etc.)
    console.error("[ProductCatalogFetcher] Erreur de chargement:", error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="text-center py-20 md:py-32">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <span className="text-2xl" aria-hidden="true">âš ï¸</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Impossible de charger les produits
        </h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          Une erreur est survenue lors du chargement du catalogue. Veuillez
          rafraÃ®chir la page ou rÃ©essayer plus tard.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
          RÃ©essayer
        </Link>
      </div>
    );
  }

  const title =
    category === "all"
      ? "Nos Produits"
      : category.charAt(0).toUpperCase() + category.slice(1);

  // Typage explicite des props transmises Ã  ProductList
  type ProductsResult = Awaited<ReturnType<typeof searchCatalogProducts>>;

  interface ProductListProps {
    products: ProductsResult["products"];
    totalCount: ProductsResult["totalCount"];
    title: string;
    pageSize: number;
  }

  const props: ProductListProps = {
    products: products!,
    totalCount: totalCount!,
    title,
    pageSize: PAGE_SIZE,
  };

  const variantProductCount = products!.filter((product) => product.variantCount > 0).length;

  return (
    <>
      <ProductVariantCatalogSummary variantProductCount={variantProductCount} />
      <ProductList {...props} />
    </>
  );
}


