// app/products/page.tsx

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

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;

  const page = Math.max(
    1,
    Number(params.page ?? "1"),
  );

  const query =
    params.q?.trim() ?? "";

  const categorySlug =
    params.category?.trim() ?? "all";

  const sort =
    params.sort ?? "newest";

  const where: Prisma.ProductWhereInput = {
    isArchived: false,
    isdeleted: false,
    deletedAt: null,
  };

  if (
    categorySlug &&
    categorySlug !== "all"
  ) {
    where.category = {
      slug: categorySlug,
    };
  }

  if (query.length > 0) {
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

  let orderBy:
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
    categories,
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

    prisma.product.count({
      where,
    }),

    prisma.category.findMany({
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
    }),
  ]);

  const formattedProducts =
    products.map(mapCatalogProduct);

  const categoriesList = [
    "all",
    ...categories.map(
      (category) => category.slug,
    ),
  ];

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
