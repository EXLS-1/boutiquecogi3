/**
 * =============================================================================
 * category CONSTANTS — Boutiquecogi3
 * =============================================================================
 * Centralisation de toutes les constantes liées aux categoryS.
 *
 * PLAN DE MIGRATION:
 * 1. Créer un seed Prisma qui génère les catégories avec UUID v7
 * 2. Remplacer STATIC_CATEGORIES par une requête DB dans les composants
 * 3. Conserver ces constantes comme fallback / configuration par défaut
 */

import {
  categoryDefinition,
  category_TYPES,
  Role_Level,
} from "./category-types";

const DEFAULT_MIN_RBAC_LEVEL: Role_Level = 0 as Role_Level;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONFIGURATION GRID
// ═════════════════════════════════════════════════════════════════════════════


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: CATÉGORIES STATIQUES (Fallback)
// ═════════════════════════════════════════════════════════════════════════════
//
// ATTENTION: Ces IDs sont codés en dur. Pour une architecture scalable,
// utiliser getCategoriesFromDB() qui interroge Prisma avec UUID v7.
// Ces constantes servent de fallback et de configuration initiale.

export const STATIC_CATEGORIES: readonly categoryDefinition[] = [
  {
    id: "cat-femme-001", // TODO: Remplacer par UUID v7 en DB
    slug: "femme",
    title: "HABIT FEMME",
    subtitle: "Élégance et sophistication",
    imageSrc: "/Media/pict01.webp",
    imageAlt: "Habit Femme",
    href: "/products?category=femme",
    type: category_TYPES.STATIC,
    sortOrder: 10,
    isActive: true,
    minRbacLevel: DEFAULT_MIN_RBAC_LEVEL,
    requiresAuth: false,
  },
  {
    id: "cat-homme-002", // TODO: Remplacer par UUID v7 en DB
    slug: "homme",
    title: "HABIT HOMME",
    subtitle: "Style moderne et raffiné",
    imageSrc: "/Media/pict02.webp",
    imageAlt: "Habit Homme",
    href: "/products?category=homme",
    type: category_TYPES.STATIC,
    sortOrder: 20,
    isActive: true,
    minRbacLevel: DEFAULT_MIN_RBAC_LEVEL,
    requiresAuth: false,
  },
  {
    id: "cat-enfant-003", // TODO: Remplacer par UUID v7 en DB
    slug: "enfant",
    title: "HABIT ENFANT",
    subtitle: "Tendresse et qualité",
    imageSrc: "/Media/pict03.webp",
    imageAlt: "Habit Enfant",
    href: "/products?category=enfant",
    type: category_TYPES.STATIC,
    sortOrder: 30,
    isActive: true,
    minRbacLevel: DEFAULT_MIN_RBAC_LEVEL,
    requiresAuth: false,
  },
  {
    id: "cat-sac-004", // TODO: Remplacer par UUID v7 en DB
    slug: "sac",
    title: "SAC DAME",
    subtitle: "Accessoires indispensables",
    imageSrc: "/Media/pict04.webp",
    imageAlt: "Sac Dame",
    href: "/products?category=sac",
    type: category_TYPES.STATIC,
    sortOrder: 40,
    isActive: true,
    minRbacLevel: DEFAULT_MIN_RBAC_LEVEL,
    requiresAuth: false,
  },
  {
    id: "cat-chaussure-005", // TODO: Remplacer par UUID v7 en DB
    slug: "chaussure",
    title: "CHAUSSURE DAME",
    subtitle: "Chaussures indispensables",
    imageSrc: "/Media/pict04.webp",
    imageAlt: "Chaussure Dame",
    href: "/products?category=chaussure",
    type: category_TYPES.STATIC,
    sortOrder: 50,
    isActive: true,
    minRbacLevel: DEFAULT_MIN_RBAC_LEVEL,
    requiresAuth: false,
  },
  {
    id: "cat-accessoire-006", // TODO: Remplacer par UUID v7 en DB
    slug: "accessoire",
    title: "ACCESSOIRE",
    subtitle: "Accessoires indispensables",
    imageSrc: "/Media/pict04.webp",
    imageAlt: "Accessoire",
    href: "/products?category=accessoire",
    type: category_TYPES.STATIC,
    sortOrder: 60,
    isActive: true,
    minRbacLevel: DEFAULT_MIN_RBAC_LEVEL,
    requiresAuth: false,
  },
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: CATÉGORIES PROMOTIONNELLES
// ═════════════════════════════════════════════════════════════════════════════

export const PROMOTIONAL_CATEGORIES: readonly categoryDefinition[] = [
  {
    id: "cat-promo-001",
    slug: "promotions",
    title: "PROMOTIONS",
    subtitle: "Profitez de nos meilleures offres",
    imageSrc: "/Media/pict-promo.webp",
    imageAlt: "Promotions en cours",
    href: "/products?filter=promotions",
    type: category_TYPES.PROMOTIONAL,
    sortOrder: 5, // Affiché AVANT les catégories statiques
    isActive: true,
    minRbacLevel: DEFAULT_MIN_RBAC_LEVEL,
    requiresAuth: false,
  },
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: CATÉGORIES NOUVEAUTÉS
// ═════════════════════════════════════════════════════════════════════════════

export const NEW_ARRIVAL_CATEGORIES: readonly categoryDefinition[] = [
  {
    id: "cat-new-001",
    slug: "nouveautes",
    title: "NOUVEAUTÉS",
    subtitle: "Découvrez nos derniers arrivages",
    imageSrc: "/Media/pict-new.webp",
    imageAlt: "Nouveautés",
    href: "/products?filter=nouveautes",
    type: category_TYPES.NEW_ARRIVAL,
    sortOrder: 0, // Premier
    isActive: true,
    minRbacLevel: DEFAULT_MIN_RBAC_LEVEL,
    requiresAuth: false,
  },
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: REGROUPEMENT
// ═════════════════════════════════════════════════════════════════════════════

export const ALL_CATEGORIES: readonly categoryDefinition[] = [
  ...NEW_ARRIVAL_CATEGORIES,
  ...PROMOTIONAL_CATEGORIES,
  ...STATIC_CATEGORIES,
] as const;
