/**
 * =============================================================================
 * CATEGORY CONSTANTS - Boutiquecogi3
 * =============================================================================
 * Centralisation de toutes les constantes liées aux catégories.
 */

import { CategoryDefinition, RBAC_LEVELS, CATEGORY_TYPES } from "./category-types";

// ─── Configuration Grid par défaut ─────────────────────────────────────────────
export const DEFAULT_GRID_CONFIG = {
  columns: { mobile: 1, tablet: 2, desktop: 3 },
  gap: "2rem", // gap-8
} as const;

// ─── Définitions des Catégories Statiques ─────────────────────────────────────
// Ordre déterministe (sortOrder). Ajouter une catégorie = ajouter un objet ici.
export const STATIC_CATEGORIES: readonly CategoryDefinition[] = [
  {
    id: "cat-femme-001",
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
    id: "cat-homme-002",
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
    id: "cat-enfant-003",
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
    id: "cat-sac-004",
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
    id: "cat-chaussure-005",
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
    id: "cat-accessoire-006",
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

// ─── Définitions des Catégories Promotionnelles ──────────────────────────────
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

// ─── Définitions des Catégories Nouveautés ───────────────────────────────────
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

// ─── Regroupement de toutes les catégories ────────────────────────────────────
export const ALL_CATEGORIES: readonly CategoryDefinition[] = [
  ...NEW_ARRIVAL_CATEGORIES,
  ...PROMOTIONAL_CATEGORIES,
  ...STATIC_CATEGORIES,
] as const;
