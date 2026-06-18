import { Suspense, cache } from "react";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProductCatalog from "@/components/product/product-catalog";
import { CategoryCard } from "@/components/category/category-card";
import { Pagination } from "@/components/ui/pagination";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog/catalog-constants";
import { mapCatalogProduct } from "@/lib/catalog/catalog-mappers";
import { z } from "zod";

// --- VALIDATION ET TYPAGE ---

const searchParamsSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  sort: z
    .enum(["newest", "basePrice-asc", "basePrice-desc"])
    .optional()
    .default("newest"),
  category: z.string().optional().default("all"),
  q: z.string().optional().default(""),
});

type ValidatedSearchParams = z.infer<typeof searchParamsSchema>;

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    category?: string;
    q?: string;
  }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

// --- FONCTIONS AUXILIAIRES ET CACHE ---

const getCachedCategories = cache(async () => {
  return prisma.category.findMany({
    where: {
      products: {
        some: {
          isArchived: false,
          isdeleted: false,
          deletedAt: null,
        },
      },
    },
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });
});

function buildPaginationUrl(page: number, params: ValidatedSearchParams): string {
  const urlParams = new URLSearchParams();
  urlParams.set("page", page.toString());
  if (params.sort !== "newest") urlParams.set("sort", params.sort);
  if (params.category !== "all") urlParams.set("category", params.category);
  if (params.q) urlParams.set("q", params.q);
  return `${BASE_URL}/products?${urlParams.toString()}`;
}

// --- GENERATION DES METADONNÉES (SÉCURISÉE CORRÉLATION REQUÊTES) ---

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const rawParams = await searchParams;
  const parsed = searchParamsSchema.safeParse(rawParams);
  const data = parsed.success ? parsed.data : searchParamsSchema.parse({});

  const title = data.category !== "all" 
    ? `Produits ${data.category} | Boutique COGI` 
    : "Catalogue complet | Boutique COGI";

  return {
    title,
    description: "Découvrez notre catalogue complet de produits de haute qualité adaptés à vos besoins.",
    alternates: {
      canonical: `${BASE_URL}/products`,
    },
  };
}

// --- COMPOSANT DE PAGE PRINCIPAL ---

export const revalidate = 300; // ISR à 5 minutes

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // Résolution asynchrone des searchParams propre à Next.js 16
  const rawParams = await searchParams;
  const parsedParams = searchParamsSchema.safeParse(rawParams);
  
  // Remplacement immédiat par les valeurs par défaut si altération de l'URL
  const validatedData = parsedParams.success ? parsedParams.data : searchParamsSchema.parse({});
  const { page, sort, category: categorySlug, q: query } = validatedData;

  // Construction stricte de la clause WHERE (Performance Index Database)
  const where: Prisma.ProductWhereInput = {
    isArchived: false,
    isdeleted: false,
    deletedAt: null,
  };

  if (categorySlug && categorySlug !== "all") {
    where.category = { slug: categorySlug };
  }

  if (query.trim().length > 0) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  // Configuration de l'ordre de tri (Garantie de déterminisme via ID)
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { createdAt: "desc" },
    { id: "desc" },
  ];

  if (sort === "basePrice-asc") {
    orderBy = [{ basePrice: "asc" }, { id: "asc" }];
  } else if (sort === "basePrice-desc") {
    orderBy = [{ basePrice: "desc" }, { id: "desc" }];
  }

  // Exécution parallélisée non bloquante via Prisma Pool
  const [products, totalCount, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * CATALOG_PAGE_SIZE,
      take: CATALOG_PAGE_SIZE,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        availabilityProjection: {
          select: { isAvailable: true },
        },
        productImages: {
          orderBy: { position: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    }),
    prisma.product.count({ where }),
    getCachedCategories(),
  ]);

  const formattedProducts = products.map(mapCatalogProduct);
  const categoriesList = ["all", ...categories.map((c) => c.slug)];
  const totalPages = Math.ceil(totalCount / CATALOG_PAGE_SIZE);

  // Sécurité aux limites : Empêcher le rendu d'une page hors-limite supérieure
  if (page > totalPages && totalPages > 0) {
    // Optionnel : rediriger ou forcer la dernière page
    const lastPageParams = buildPaginationUrl(totalPages, validatedData);
  }

  return (
    <main className="container mx-auto px-4 pb-12 bg-background md:px-6">
      <CategoryCard className="mb-8" />

      <ProductCatalog
        title="Notre Catalogue"
        products={formattedProducts}
        totalCount={totalCount}
        categories={categoriesList}
      />

      {totalPages > 1 && (
        <div className="mt-12 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            hasPrevPage={page > 1}
            hasNextPage={page < totalPages}
            baseUrl="/products"
            // Injection propre des objets nécessaires pour la compatibilité descendante des deux composants
            searchParams={{
              category: categorySlug,
              sort: sort,
              q: query,
            }}
          />
        </div>
      )}
    </main>
  );
}