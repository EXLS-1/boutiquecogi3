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
      where: { deletedAt: null },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        image: true,
        displayOrder: true,
        isNavigable: true,
        minRoleLevel: true,
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      title: cat.name,
      subtitle: cat.subtitle ?? "",
      imageSrc: cat.image ?? "/placeholder.webp",
      imageAlt: cat.name,
      href: `/products?category=${cat.slug}`,
      type: CATEGORY_TYPES.STATIC,
      sortOrder: cat.displayOrder,
      isActive: cat.isNavigable,
      minRbacLevel: (cat.minRoleLevel ??
        RBAC_LEVELS.GUEST) as (typeof RBAC_LEVELS)[keyof typeof RBAC_LEVELS],
      requiresAuth: false,
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
        deletedAt: null,
      },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        image: true,
        displayOrder: true,
        isNavigable: true,
        minRoleLevel: true,
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      title: cat.name,
      subtitle: cat.subtitle ?? "",
      imageSrc: cat.image ?? "/placeholder.webp",
      imageAlt: cat.name,
      href: `/products?category=${cat.slug}`,
      type: CATEGORY_TYPES.STATIC,
      sortOrder: cat.displayOrder,
      isActive: cat.isNavigable,
      minRbacLevel: (cat.minRoleLevel ??
        RBAC_LEVELS.GUEST) as (typeof RBAC_LEVELS)[keyof typeof RBAC_LEVELS],
      requiresAuth: false,
    }));
  },
);
