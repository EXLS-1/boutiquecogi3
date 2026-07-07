/**
 * =============================================================================
 * METADATA HELPERS — Pages Catalogue
 * =============================================================================
 * Génération des métadonnées dynamiques pour les pages catalogue.
 * Centralise la construction des objets Metadata Next.js.
 */

import type { Metadata } from "next";
import { getCatalogCategories } from "@/lib/product-catalog/catalog-queries";

const OG_IMAGE_DIMENSIONS = { width: 1200, height: 630 } as const;

// ─── Stats pour métadonnées page index ──────────────────────────────────────

export async function getCatalogStatsForMetadata(): Promise<{
  description: string;
  topCategories: string[];
} | null> {
  try {
    const categories = await getCatalogCategories();
    const topCategories = categories
      .slice(0, 5)
      .map((c: { name: string }) => c.name.toLowerCase());

    return {
      description: `Découvrez ${categories.length} catégories de mode : ${topCategories.join(", ")} et bien plus encore.`,
      topCategories,
    };
  } catch {
    return null;
  }
}

// ─── Builders de métadonnées ────────────────────────────────────────────────

interface CategoryMetaInput {
  readonly name: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly slug: string;
}

interface ParentImages {
  readonly openGraph?: { images?: Metadata["openGraph"]["images"] };
}

/**
 * Construit les métadonnées pour la page index du catalogue.
 */
export async function buildCatalogIndexMetadata(
  catalogStats: { description: string; topCategories: string[] } | null,
  parentImages: ParentImages
): Promise<Metadata> {
  const description =
    catalogStats?.description ??
    "Parcourez nos différents catalogues de produits parcourant chaque mode: Mode femme, homme, enfant, accessoires et plus encore.";

  return {
    title: {
      default: "Catalogue des Produits | Boutique COGI",
      template: "%s | Boutique COGI",
    },
    description,
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
      description,
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
        ...(parentImages.openGraph?.images ?? []),
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Catalogue | Boutique COGI",
      description,
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

/**
 * Construit les métadonnées pour une page de catégorie.
 */
export function buildCategoryMetadata(
  category: CategoryMetaInput,
  parentImages: ParentImages
): Metadata {
  const categoryName = category.name;
  const description =
    category.description ??
    `Découvrez notre collection ${categoryName.toLowerCase()} chez Boutique COGI. Des produits soigneusement sélectionnés pour vous.`;

  const imageUrl = category.imageUrl ?? "/og/catalog-default.jpg";

  return {
    title: `${categoryName} | Boutique COGI`,
    description,
    keywords: [
      categoryName.toLowerCase(),
      "mode",
      "boutique",
      "cogi",
      "collection",
      "shopping",
    ],
    openGraph: {
      title: `${categoryName} | Boutique COGI`,
      description,
      type: "website",
      siteName: "Boutique COGI",
      locale: "fr_FR",
      images: [
        {
          url: imageUrl,
          width: OG_IMAGE_DIMENSIONS.width,
          height: OG_IMAGE_DIMENSIONS.height,
          alt: `Collection ${categoryName} - Boutique COGI`,
        },
        ...(parentImages.openGraph?.images ?? []),
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${categoryName} | Boutique COGI`,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `/${category.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  };
}

/**
 * Métadonnées minimales pour une catégorie non trouvée (sera redirigé vers 404).
 */
export function buildNotFoundCategoryMetadata(): Metadata {
  return {
    title: "Catégorie non trouvée | Boutique COGI",
    robots: { index: false, follow: true },
  };
}
