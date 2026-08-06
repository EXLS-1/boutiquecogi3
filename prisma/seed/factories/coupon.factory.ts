// prisma/seed/factories/coupon.factory.ts
// ============================================
// GÉNÉRATEUR DE COUPONS PROMO
// ============================================

import { DiscountType } from "@prisma/client";
import { generateDeterministicUuidV7 } from "../utils/uuid";
import { createSeededRandom, randInt } from "../utils/random";

export interface GeneratedCoupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number | null;
  expiresAt: Date;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
}

const CODES = [
  "BIENVENUE10",
  "PROMO20",
  "SOLDES25",
  "FLASH15",
  "VIP30",
  "NOUVEAU5",
  "FIDELITE20",
  "KINSHASA10",
] as const;

/**
 * Construit un coupon déterministe. Alternance PERCENTAGE / FIXED_AMOUNT.
 */
export function buildCouponFactory(index: number, seedNumber: number): GeneratedCoupon {
  const rand = createSeededRandom(seedNumber, "coupon", index);
  const isPercentage = index % 2 === 0;
  const discountType = isPercentage ? DiscountType.PERCENTAGE : DiscountType.FIXED_AMOUNT;
  const discountValue = isPercentage ? randInt(rand, 5, 30) : randInt(rand, 5, 50) * 100; // cents

  const active = index % 4 !== 3; // certains coupons expirés/inactifs

  return {
    id: generateDeterministicUuidV7("coupon", index),
    code: CODES[index % CODES.length],
    discountType,
    discountValue,
    minOrderValue: isPercentage ? null : randInt(rand, 50, 200) * 100,
    expiresAt: active
      ? new Date(Date.now() + randInt(rand, 30, 180) * 86400000)
      : new Date(Date.now() - randInt(rand, 1, 30) * 86400000),
    isActive: active,
    usageLimit: isPercentage ? null : randInt(rand, 100, 1000),
    usageCount: 0,
  };
}

/** Construit un lot de coupons. */
export function buildCouponsBatch(count: number, seedNumber: number): GeneratedCoupon[] {
  const coupons: GeneratedCoupon[] = [];
  for (let i = 0; i < count; i++) {
    coupons.push(buildCouponFactory(i, seedNumber));
  }
  return coupons;
}
