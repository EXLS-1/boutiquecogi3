/**
 * =============================================================================
 * CATEGORY DB QUERIES — Boutiquecogi3
 * =============================================================================
 * Module server-only : toutes les requêtes Prisma doivent être isolées
 * afin d'éviter que des dépendances Node (ex: pg -> dns) soient bundlées
 * dans les Client Components Next.js.
 */

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import {
  CategoryDefinition,
  RBAC_LEVELS,
  CATEGORY_TYPES,
} from "./category-types";

/**
 * Récupère les catégories actives depuis la base de données.
 *
 * @returns Catégories triées par sortOrder avec UUID v7
 */
export const getCategoriesFromDB = cache(
  async (): Promise<CategoryDefinition[]> => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        imageSrc: true,
        imageAlt: true,
        sortOrder: true,
        isActive: true,
        minRbacLevel: true,
        requiresAuth: true,
        type: true,
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      title: cat.name,
      subtitle: cat.subtitle ?? "",
      imageSrc: cat.imageSrc ?? "/placeholder.webp",
      imageAlt: cat.imageAlt ?? cat.name,
      href: `/products?category=${cat.slug}`,
      type: (cat.type as CategoryDefinition["type"]) ?? CATEGORY_TYPES.STATIC,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      minRbacLevel: (cat.minRbacLevel ??
        RBAC_LEVELS.GUEST) as (typeof RBAC_LEVELS)[keyof typeof RBAC_LEVELS],
      requiresAuth: cat.requiresAuth ?? false,
    }));
  },
);

/**
 * Récupère un ensemble spécifique de catégories (promo + nouveautés)
 * Idéal pour les bannières principales (Hero Section)
 */
export const getSpecialCategories = cache(
  async (): Promise<CategoryDefinition[]> => {
    const specialSlugs = ["promotions", "nouveautes"];

    const categories = await prisma.category.findMany({
      where: {
        slug: { in: specialSlugs },
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        imageSrc: true,
        imageAlt: true,
        sortOrder: true,
        isActive: true,
        minRbacLevel: true,
        requiresAuth: true,
        type: true,
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      title: cat.name,
      subtitle: cat.subtitle ?? "",
      imageSrc: cat.imageSrc ?? "/placeholder.webp",
      imageAlt: cat.imageAlt ?? cat.name,
      href: `/products?category=${cat.slug}`,
      type: (cat.type as CategoryDefinition["type"]) ?? CATEGORY_TYPES.STATIC,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      minRbacLevel: (cat.minRbacLevel ??
        RBAC_LEVELS.GUEST) as (typeof RBAC_LEVELS)[keyof typeof RBAC_LEVELS],
      requiresAuth: cat.requiresAuth ?? false,
    }));
  },
);
