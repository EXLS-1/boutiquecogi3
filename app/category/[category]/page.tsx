import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";

import { ProductList } from "@/components/product/product-list";
import { CategoryCard } from "@/components/category/category-card";

import {
  CATALOG_PAGE_SIZE,
} from "@/lib/catalog/catalog-constants";

import {
  mapCatalogProduct,
} from "@/lib/catalog/catalog-mappers";

export const revalidate = 300;

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;

  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const categories =
      await prisma.category.findMany({
        select: {
          slug: true,
        },
      });

    return categories.map(
      (category) => ({
        category:
          category.slug,
      }),
    );
  } catch (error) {
    console.error(
      "generateStaticParams category error:",
      error,
    );

    return [];
  }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } =
    await params;

  const categoryData =
    await prisma.category.findUnique({
      where: {
        slug: category,
      },

      select: {
        name: true,
      },
    });

  if (!categoryData) {
    return {
      title:
        "Catégorie introuvable | Boutique COGI",
    };
  }

  return {
    title: `${categoryData.name} | Boutique COGI`,

    description: `Découvrez notre collection ${categoryData.name}.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { category } =
    await params;

  const query =
    await searchParams;

  const page = Math.max(
    1,
    Number(query.page ?? "1"),
  );

  const sort =
    query.sort ?? "newest";

  const categoryData =
    await prisma.category.findUnique({
      where: {
        slug: category,
      },

      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

  if (!categoryData) {
    notFound();
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
        {
          basePrice: "asc",
        },
        {
          id: "asc",
        },
      ];
      break;

    case "basePrice-desc":
      orderBy = [
        {
          basePrice: "desc",
        },
        {
          id: "desc",
        },
      ];
      break;
  }

  const where:
    Prisma.ProductWhereInput = {
    categoryId:
      categoryData.id,

    isArchived: false,

    isdeleted: false,

    deletedAt: null,
  };

  const [
    products,
    totalCount,
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
  ]);

  const formattedProducts =
    products.map(
      mapCatalogProduct,
    );

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">

      <CategoryCard
        className="mb-8"
      />

      <section className="mt-12">

        <div className="flex flex-col items-center justify-center space-y-4 mb-12">

          <h1 className="text-3xl md:text-4xl font-playfair font-bold uppercase text-center tracking-wide">

            Collection :{" "}
            {categoryData.name}

          </h1>

          <div className="w-16 h-0.5 bg-primary" />

          <p className="text-sm text-muted-foreground">

            {totalCount}{" "}

            {totalCount > 1
              ? "articles disponibles"
              : "article disponible"}

          </p>

        </div>

        {formattedProducts.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl bg-muted/30">

            <p className="text-muted-foreground">

              Aucun produit disponible dans cette catégorie.

            </p>

          </div>
        ) : (
          <ProductList
            products={
              formattedProducts
            }
            totalCount={
              totalCount
            }
            pageSize={
              CATALOG_PAGE_SIZE
            }
          />
        )}

      </section>

    </main>
  );
}
