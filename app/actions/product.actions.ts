"use server";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

interface GetActiveProductsParams {
  category?: string;
  limit?: number;
  featured?: boolean;
}

export interface ProductSummary {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSelect = {
  id: true,
  name: true,
  description: true,
  basePrice: true,
  images: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { slug: true } },
  variants: { select: { sku: true }, take: 1 },
} as const;

function mapProduct(
  p: {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    images: string[];
    isFeatured: boolean;
    createdAt: Date;
    updatedAt: Date;
    category: { slug: string } | null;
    variants: { sku: string }[];
  }
): ProductSummary {
  return {
    id: p.variants[0]?.sku ?? p.id,
    name: p.name,
    description: p.description,
    price: Math.round(p.basePrice / 100),
    images: p.images,
    category: p.category?.slug ?? "femme",
    stock: 10,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const getActiveProducts = cache(
  async (
    params: GetActiveProductsParams = {}
  ): Promise<ActionResponse<{ products: ProductSummary[]; total: number }>> => {
    try {
      const { category, limit = 20, featured } = params;

      if (limit < 1 || limit > 50) {
        return {
          success: false,
          error: "La limite doit être comprise entre 1 et 50",
        };
      }

      const where: {
        isArchived: boolean;
        isFeatured?: boolean;
        category?: { slug: string };
      } = { isArchived: false };

      if (category) {
        where.category = { slug: category };
      }
      if (featured !== undefined) {
        where.isFeatured = featured;
      }

      const total = await prisma.product.count({ where });
      const products = await prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: productSelect,
      });

      return {
        success: true,
        data: {
          products: products.map(mapProduct),
          total,
        },
      };
    } catch (error) {
      console.error("[getActiveProducts]", error);
      return {
        success: false,
        error: "Impossible de charger le catalogue pour le moment.",
        code: "PRODUCT_FETCH_ERROR",
      };
    }
  }
);

export const getProductByIdAction = cache(
  async (id: string): Promise<ActionResponse<ProductSummary | null>> => {
    try {
      if (!id) {
        return { success: false, error: "ID de produit invalide" };
      }

      const product = await prisma.product.findFirst({
        where: {
          OR: [{ id }, { slug: id }, { variants: { some: { sku: id } } }],
          isArchived: false,
        },
        select: productSelect,
      });

      return {
        success: true,
        data: product ? mapProduct(product) : null,
      };
    } catch (error) {
      console.error("[getProductByIdAction]", error);
      return {
        success: false,
        error: "Impossible de charger le produit",
        code: "PRODUCT_FETCH_ERROR",
      };
    }
  }
);

export const getFeaturedProducts = cache(
  async (limit = 8): Promise<ActionResponse<ProductSummary[]>> => {
    try {
      const products = await prisma.product.findMany({
        where: { isArchived: false, isFeatured: true },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(limit, 1), 50),
        select: productSelect,
      });

      return { success: true, data: products.map(mapProduct) };
    } catch (error) {
      console.error("[getFeaturedProducts]", error);
      return {
        success: false,
        error: "Impossible de charger les produits en vedette",
        code: "FEATURED_FETCH_ERROR",
      };
    }
  }
);

export const getProductCategories = cache(
  async (): Promise<ActionResponse<string[]>> => {
    try {
      const categories = await prisma.category.findMany({
        select: { slug: true },
        orderBy: { name: "asc" },
      });

      return {
        success: true,
        data: categories.map((c) => c.slug),
      };
    } catch (error) {
      console.error("[getProductCategories]", error);
      return {
        success: false,
        error: "Impossible de charger les catégories",
        code: "CATEGORIES_FETCH_ERROR",
      };
    }
  }
);
