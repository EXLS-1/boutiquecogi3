// prisma/seed/factories/review.factory.ts
// ============================================
// GÉNÉRATEUR D'AVIS PRODUIT
// ============================================

import { generateDeterministicUuidV7 } from "../utils/uuid";
import { createSeededRandom, randInt, pick } from "../utils/random";

export interface GeneratedReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: Date;
}

const COMMENTS = [
  "Excellent produit, conforme à la description.",
  "Très bonne qualité, je recommande vivement.",
  "Livraison rapide et produit conforme.",
  "Bon rapport qualité-prix.",
  "Satisfait de mon achat, service client réactif.",
  "Produit conforme, mais délai de livraison un peu long.",
  "Très élégant, reçu beaucoup de compliments.",
  "Qualité supérieure, dépasse mes attentes.",
] as const;

/**
 * Construit un avis produit déterministe.
 * `seedNumber` combine avec l'index pour un PRNG stable.
 */
export function buildReviewFactory(
  index: number,
  productId: string,
  userId: string,
  seedNumber: number,
): GeneratedReview {
  const rand = createSeededRandom(seedNumber, "review", index);
  const rating = randInt(rand, 3, 5); // 3-5 étoiles majoritairement
  const comment = pick(rand, COMMENTS);

  return {
    id: generateDeterministicUuidV7("review", index),
    productId,
    userId,
    rating,
    comment,
    isVerifiedPurchase: index % 3 !== 0,
    createdAt: new Date(Date.now() - randInt(rand, 1, 90) * 86400000),
  };
}
