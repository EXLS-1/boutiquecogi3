// app/actions/product.actions.ts
'use server';

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Product } from "@prisma/client";

// Type standardisé pour les actions serveur
export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

interface GetActiveProductsParams {
  category?: string;
  limit?: number;
  featured?: boolean;
}

interface ProductSummary {
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

/**
 * Action métier :
 * - retourne les produits actifs
 * - filtrage optionnel par catégorie
 * - pagination
 * - cache serveur
 */
export const getActiveProducts = cache(
  async (
    params: GetActiveProductsParams = {}
  ): Promise<ActionResponse<{ products: ProductSummary[]; total: number }>> => {
    try {
      const { category, limit = 20, featured } = params;

      // Validation
      if (limit < 1 || limit > 50) {
        return {
          success: false,
          error: "La limite doit être comprise entre 1 et 50"
        };
      }

      const where: any = {
        isArchived: false,
      };

      if (category) {
        where.category = category;
      }

      if (featured !== undefined) {
        where.isFeatured = featured;
      }

      // Compter le total
      const total = await prisma.product.count({ where });

      // Récupérer les produits avec sélection explicite des champs
      const products = await prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          category: true,
          stock: true,
          isFeatured: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        data: { products, total }
      };
    } catch (error) {
      console.error("[getActiveProducts]", error);

      return {
        success: false,
        error: "Impossible de charger le catalogue pour le moment.",
        code: "PRODUCT_FETCH_ERROR"
      };
    }
  }
);

/**
 * Récupérer un produit par son ID
 */
export const getProductById = cache(
  async (id: string): Promise<ActionResponse<ProductSummary | null>> => {
    try {
      if (!id || typeof id !== 'string') {
        return {
          success: false,
          error: "ID de produit invalide"
        };
      }

      const product = await prisma.product.findUnique({
        where: { id, isArchived: false },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          category: true,
          stock: true,
          isFeatured: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        data: product
      };
    } catch (error) {
      console.error("[getProductById]", error);

      return {
        success: false,
        error: "Impossible de charger le produit",
        code: "PRODUCT_FETCH_ERROR"
      };
    }
  }
);

/**
 * Récupérer les produits mis en avant
 */
export const getFeaturedProducts = cache(
  async (limit: number = 8): Promise<ActionResponse<ProductSummary[]>> => {
    try {
      if (limit < 1 || limit > 50) {
        return {
          success: false,
          error: "La limite doit être comprise entre 1 et 50"
        };
      }

      const products = await prisma.product.findMany({
        where: {
          isArchived: false,
          isFeatured: true
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          category: true,
          stock: true,
          isFeatured: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        data: products
      };
    } catch (error) {
      console.error("[getFeaturedProducts]", error);

      return {
        success: false,
        error: "Impossible de charger les produits en vedette",
        code: "FEATURED_FETCH_ERROR"
      };
    }
  }
);

/**
 * Récupérer les catégories disponibles
 */
export const getProductCategories = cache(
  async (): Promise<ActionResponse<string[]>> => {
    try {
      const categories = await prisma.product.findMany({
        where: { isArchived: false },
        distinct: ['category'],
        select: { category: true }
      });

      return {
        success: true,
        data: categories.map(c => c.category).filter(Boolean) as string[]
      };
    } catch (error) {
      console.error("[getProductCategories]", error);

      return {
        success: false,
        error: "Impossible de charger les catégories",
        code: "CATEGORIES_FETCH_ERROR"
      };
    }
  }
);