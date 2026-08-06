// prisma/seed/factories/address.factory.ts
// ============================================
// GÉNÉRATEUR D'ADRESSES RDC (Communes, Quartiers, Repères)
// ============================================

import { generateDeterministicUuidV7 } from "../utils/uuid";
import { pick } from "../utils/random";

export interface GeneratedAddress {
  id: string;
  userId: string;
  label: string;
  street: string;
  commune: string;
  city: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const KINSHASA_COMMUNES = [
  "Gombe",
  "Ngaliema",
  "Limete",
  "Kasa-Vubu",
  "Bandalungwa",
  "Lingwala",
  "Mont-Ngafula",
  "Lemba",
  "Barumbu",
  "Kalamu",
] as const;

const STREETS = [
  "Avenue du Commerce",
  "Boulevard du 30 Juin",
  "Avenue de la Libération",
  "Avenue du Tourisme",
  "Avenue de la Paix",
  "Boulevard Lumumba",
] as const;

const LANDMARKS = [
  "En face de la station Total",
  "Près de la pharmacie centrale",
  "À côté du marché",
  "Réf. École primaire",
  "En face de l'église",
] as const;

const PHONE_PREFIXES = ["+24381", "+24389", "+24399", "+24382"] as const;

export interface BuildAddressOptions {
  label?: string;
  commune?: string;
  city?: string;
  country?: string;
  isDefault?: boolean;
}

/**
 * Construit une adresse réaliste pour Kinshasa (RDC).
 * Déterministe via l'index et le seedNumber.
 */
export function buildAddressFactory(
  index: number,
  userId: string,
  seedNumber: number,
  options: BuildAddressOptions = {},
): GeneratedAddress {
  const rand = (() => {
    // PRNG déterministe simple (xorshift-like) basé sur seedNumber + index
    let s = (seedNumber + index * 2654435761) >>> 0;
    return () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })();

  const commune = options.commune ?? pick(rand, KINSHASA_COMMUNES);
  const street = pick(rand, STREETS);
  const landmark = pick(rand, LANDMARKS);
  const phonePrefix = pick(rand, PHONE_PREFIXES);

  return {
    id: generateDeterministicUuidV7("address", index),
    userId,
    label: options.label ?? (options.isDefault ? "Adresse principale" : `Adresse ${index + 1}`),
    street: `${street} N° ${(index * 7) % 150 + 1}, ${landmark}`,
    commune,
    city: options.city ?? "Kinshasa",
    country: options.country ?? "RDC",
    phone: `${phonePrefix}${String(index).padStart(7, "0")}`,
    isDefault: options.isDefault ?? index === 0,
  };
}
