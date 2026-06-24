/**
 * =============================================================================
 * CATEGORY CONSTANTS — Boutiquecogi3
 * =============================================================================
 * Centralisation de toutes les constantes liées aux catégories.
 * 
 * Problème audit #10: IDs codés en dur.
 * Recommandation: Migrer vers UUID v7 générés via seed Prisma.
 * 
 * PLAN DE MIGRATION:
 * 1. Créer un seed Prisma qui génère les catégories avec UUID v7
 * 2. Remplacer STATIC_CATEGORIES par une requête DB dans les composants
 * 3. Conserver ces constantes comme fallback / configuration par défaut
 */

import { CategoryDefinition, RBAC_LEVELS, CATEGORY_TYPES } from "./category-types";

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONFIGURATION GRID
// ═════════════════════════════════════════════════════════════════════════════

export const DEFAULT_GRID_CONFIG = {
  columns: { mobile: 1, tablet: 2, desktop: 3 },
  gap: "2rem", // gap-8
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: CATÉGORIES STATIQUES (Fallback)
// ═════════════════════════════════════════════════════════════════════════════
// 
// ATTENTION: Ces IDs sont codés en dur. Pour une architecture scalable,
// utiliser getCategoriesFromDB() qui interroge Prisma avec UUID v7.
// Ces constantes servent de fallback et de configuration initiale.

export const STATIC_CATEGORIES: readonly CategoryDefinition[] = [
  {
    id: "cat-femme-001",  // TODO: Remplacer par UUID v7 en DB
    slug: "femme",
    title: "HABIT FEMME",
    subtitle: "Élégance et sophistication",
    imageSrc: "/Media/pict01.webp",
    imageAlt: "Habit Femme",
    href: "/products?category=femme",
    type: CATEGORY_TYPES.STATIC,
    sortOrder: 10,
    isActive: true,
    minRbacLevel: RBAC_LEVELS.GUEST,
    requiresAuth: false,
  },
  {
    id: "cat-homme-002",  // TODO: Remplacer par UUID v7 en DB
    slug: "homme",
    title: "HABIT HOMME",
    subtitle: "Style moderne et raffiné",
    imageSrc: "/Media/pict02.webp",
    imageAlt: "Habit Homme",
    href: "/products?category=homme",
    type: CATEGORY_TYPES.STATIC,
    sortOrder: 20,
    isActive: true,
    minRbacLevel: RBAC_LEVELS.GUEST,
    requiresAuth: false,
  },
  {
    id: "cat-enfant-003",  // TODO: Remplacer par UUID v7 en DB
    slug: "enfant",
    title: "HABIT ENFANT",
    subtitle: "Tendresse et qualité",
    imageSrc: "/Media/pict03.webp",
    imageAlt: "Habit Enfant",
    href: "/products?category=enfant",
    type: CATEGORY_TYPES.STATIC,
    sortOrder: 30,
    isActive: true,
    minRbacLevel: RBAC_LEVELS.GUEST,
    requiresAuth: false,
  },
  {
    id: "cat-sac-004",  // TODO: Remplacer par UUID v7 en DB
    slug: "sac",
    title: "SAC DAME",
    subtitle: "Accessoires indispensables",
    imageSrc: "/Media/pict04.webp",
    imageAlt: "Sac Dame",
    href: "/products?category=sac",
    type: CATEGORY_TYPES.STATIC,
    sortOrder: 40,
    isActive: true,
    minRbacLevel: RBAC_LEVELS.GUEST,
    requiresAuth: false,
  },
  {
    id: "cat-chaussure-005",  // TODO: Remplacer par UUID v7 en DB
    slug: "chaussure",
    title: "CHAUSSURE DAME",
    subtitle: "Chaussures indispensables",
    imageSrc: "/Media/pict04.webp",
    imageAlt: "Chaussure Dame",
    href: "/products?category=chaussure",
    type: CATEGORY_TYPES.STATIC,
    sortOrder: 50,
    isActive: true,
    minRbacLevel: RBAC_LEVELS.GUEST,
    requiresAuth: false,
  },
  {
    id: "cat-accessoire-006",  // TODO: Remplacer par UUID v7 en DB
    slug: "accessoire",
    title: "ACCESSOIRE",
    subtitle: "Accessoires indispensables",
    imageSrc: "/Media/pict04.webp",
    imageAlt: "Accessoire",
    href: "/products?category=accessoire",
    type: CATEGORY_TYPES.STATIC,
    sortOrder: 60,
    isActive: true,
    minRbacLevel: RBAC_LEVELS.GUEST,
    requiresAuth: false,
  },
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: CATÉGORIES PROMOTIONNELLES
// ═════════════════════════════════════════════════════════════════════════════

export const PROMOTIONAL_CATEGORIES: readonly CategoryDefinition[] = [
  {
    id: "cat-promo-001",
    slug: "promotions",
    title: "PROMOTIONS",
    subtitle: "Profitez de nos meilleures offres",
    imageSrc: "/Media/pict-promo.webp",
    imageAlt: "Promotions en cours",
    href: "/products?filter=promotions",
    type: CATEGORY_TYPES.PROMOTIONAL,
    sortOrder: 5, // Affiché AVANT les catégories statiques
    isActive: true,
    minRbacLevel: RBAC_LEVELS.GUEST,
    requiresAuth: false,
  },
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: CATÉGORIES NOUVEAUTÉS
// ═════════════════════════════════════════════════════════════════════════════

export const NEW_ARRIVAL_CATEGORIES: readonly CategoryDefinition[] = [
  {
    id: "cat-new-001",
    slug: "nouveautes",
    title: "NOUVEAUTÉS",
    subtitle: "Découvrez nos derniers arrivages",
    imageSrc: "/Media/pict-new.webp",
    imageAlt: "Nouveautés",
    href: "/products?filter=nouveautes",
    type: CATEGORY_TYPES.NEW_ARRIVAL,
    sortOrder: 0, // Premier
    isActive: true,
    minRbacLevel: RBAC_LEVELS.GUEST,
    requiresAuth: false,
  },
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: REGROUPEMENT
// ═════════════════════════════════════════════════════════════════════════════

export const ALL_CATEGORIES: readonly CategoryDefinition[] = [
  ...NEW_ARRIVAL_CATEGORIES,
  ...PROMOTIONAL_CATEGORIES,
  ...STATIC_CATEGORIES,
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: FONCTIONS D'ACCÈS DB (Recommandé pour production)
// ═════════════════════════════════════════════════════════════════════════════
// 
// Problème audit #10: Ces fonctions remplacent progressivement les constantes
// statiques par des requêtes Prisma dynamiques avec UUID v7.

import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Récupère les catégories actives depuis la base de données.
 * À utiliser préférentiellement à ALL_CATEGORIES en production.
 * 
 * @returns Catégories triées par sortOrder avec UUID v7
 */
export const getCategoriesFromDB = cache(async (): Promise<CategoryDefinition[]> => {
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
    id: cat.id,           // UUID v7 depuis Prisma
    slug: cat.slug,
    title: cat.name,
    subtitle: cat.subtitle ?? "",
    imageSrc: cat.imageSrc ?? "/placeholder.webp",
    imageAlt: cat.imageAlt ?? cat.name,
    href: `/products?category=${cat.slug}`,
    type: (cat.type as CategoryDefinition["type"]) ?? CATEGORY_TYPES.STATIC,
    sortOrder: cat.sortOrder,
    isActive: cat.isActive,
    minRbacLevel: (cat.minRbacLevel ?? RBAC_LEVELS.GUEST) as typeof RBAC_LEVELS[keyof typeof RBAC_LEVELS],
    requiresAuth: cat.requiresAuth ?? false,
  }));
});

/**
 * Récupère un ensemble spécifique de catégories (promo + nouveautés)
 * Idéal pour les bannières principales (Hero Section)
 * 
 * @returns Catégories spéciales triées par sortOrder
 */
export const getSpecialCategories = cache(async (): Promise<CategoryDefinition[]> => {
  // On sélectionne seulement les catégories qui ont un intérêt marketing fort
  const specialSlugs = ['promotions', 'nouveautes'];
  
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
    minRbacLevel: (cat.minRbacLevel ?? RBAC_LEVELS.GUEST) as typeof RBAC_LEVELS[keyof typeof RBAC_LEVELS],
    requiresAuth: cat.requiresAuth ?? false,
  }));
});
