// app/products/page.tsx

import { Suspense } from "react";
import { cache } from "react";
import { Metadata } from "next";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

import ProductCatalog from "@/components/product/product-catalog";
import { CategoryCard } from "@/components/category/category-card";

import {
  CATALOG_PAGE_SIZE,
} from "@/lib/catalog/catalog-constants";

import {
  mapCatalogProduct,
} from "@/lib/catalog/catalog-mappers";
import { z } from "zod";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Catalogue | Boutique COGI",
  description:
    "Découvrez notre catalogue complet de produits.",
};

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    category?: string;
    q?: string;
  }>;
}

// Schéma de validation Zod pour les paramètres de recherche
const searchParamsSchema = z.object({
  page: z.string().optional().default("1").transform(Number).pipe(z.number().int().min(1)),
  sort: z.enum(["newest", "basePrice-asc", "basePrice-desc"]).optional().default("newest"),
  category: z.string().optional().default("all"),
  q: z.string().optional().default(""),
});

// Type pour les paramètres de recherche validés
type ValidatedSearchParams = z.infer<typeof searchParamsSchema>;

// Fonction pour récupérer les catégories avec mise en cache
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
    orderBy: {
      name: "asc",
    },
    select: {
      name: true,
      slug: true,
    },
  });
});

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  // Validation des paramètres de recherche
  const parsedParams = searchParamsSchema.safeParse(await searchParams);

  if (!parsedParams.success) {
    // Gérer l'erreur de validation, par exemple en redirigeant ou en affichant une erreur
    // Pour l'instant, on utilise les valeurs par défaut ou on pourrait lancer une erreur
    console.error("Invalid search parameters:", parsedParams.error);
    // Ou rediriger vers une page d'erreur ou la page de produits sans paramètres invalides
    // throw new Error("Paramètres de recherche invalides.");
  }

  const { page, sort, category: categorySlug, q: query } = parsedParams.success ? parsedParams.data : searchParamsSchema.parse({}); // Fallback to defaults

  const where: Prisma.ProductWhereInput = { // Typage strict
    isArchived: false,
    isdeleted: false,
    deletedAt: null,
  };

  if (categorySlug && categorySlug !== "all") {
    where.category = {
      slug: categorySlug,
    };
  }

  if (query.length > 0) { // La validation de la longueur max peut être faite via Zod
    where.OR = [
      {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  let orderBy: // Typage strict
    Prisma.ProductOrderByWithRelationInput[] = [
    {
      createdAt: "desc",
    },
    {
      id: "desc",
    },
  ];

  switch (sort) {
    case "basePrice-asc":
      orderBy = [
        { basePrice: "asc" },
        { id: "asc" },
      ];
      break;

    case "basePrice-desc":
      orderBy = [
        { basePrice: "desc" },
        { id: "desc" },
      ];
      break;
  }

  const [
    products,
    totalCount,
    categories, // Utilisation de la fonction cachée
  ] = await Promise.all([
    prisma.product.findMany({
      where,

      orderBy,

      skip:
        (page - 1) *
        CATALOG_PAGE_SIZE,

      take:
        CATALOG_PAGE_SIZE,

      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        availabilityProjection: {
          select: {
            isAvailable: true,
          },
        },

        productImages: {
          orderBy: {
            position: "asc",
          },

          take: 1,

          select: {
            url: true,
          },
        },
      },
    }),

    prisma.product.count({ where }),

    getCachedCategories(), // Appel de la fonction de récupération des catégories cachée
  ]);

  const formattedProducts =
    products.map(mapCatalogProduct);

  const categoriesList = [
    "all",
    ...categories.map((category) => category.slug),
  ];

  // Calcul pour les balises SEO rel="prev" et rel="next"
  const totalPages = Math.ceil(totalCount / CATALOG_PAGE_SIZE);
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;
  
  // Construction robuste des URLs de pagination
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const createPaginationUrl = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", p.toString());
    if (sort !== "newest") params.set("sort", sort);
    if (categorySlug !== "all") params.set("category", categorySlug);
    if (query) params.set("q", query);
    return `${baseUrl}/products?${params.toString()}`;
  };

  // Note: Dans Next.js App Router, il est préférable d'utiliser generateMetadata 
  // pour les données dynamiques au lieu de muter l'objet statique exporté.
  metadata.alternates = {
    canonical: `${baseUrl}/products`,
    // Injection sécurisée des balises prev/next
    ...(hasPrevPage && { prev: createPaginationUrl(page - 1) }),
    ...(hasNextPage && { next: createPaginationUrl(page + 1) }),
  } as any;



  return (
    <main className="pb-12 bg-background">
      <CategoryCard className="mb-8" />

      <ProductCatalog
        title="Notre Catalogue"
        products={formattedProducts}
        totalCount={totalCount}
        categories={categoriesList}
      />
    </main>
  );
}
