// app/checkout/_components/checkout-helpers.ts
/**
 * =============================================================================
 * CHECKOUT HELPERS — Boutiquecogi3
 * =============================================================================
 * Logique PURE (testable sans DOM ni serveur) utilisée par `checkout-client.tsx` :
 *
 *  1. Validation runtime de la prop `user` issue de la session Better-Auth.
 *  2. Normalisation du panier Zustand (`CartItem` = `{ product, quantity }`)
 *     vers le contrat EXACT attendu par `processCinetPayCheckout` :
 *     `{ id, name, price, quantity }[]`.
 *  3. Résolution du prix unitaire selon la devise d'affichage (USD / CDF),
 *     alignée sur `store/use-cart` (`getTotalPrice`).
 *  4. Normalisation des numéros Mobile Money (RDC : +243 / 0 + 8|9 XXXXXXXX).
 *
 * Contrainte : aucun import RUNTIME (uniquement `import type`), afin que ce
 * module reste utilisable côté client sans embarquer Prisma / zod.
 */

import type { DisplayCurrency } from "@/lib/currency/exchange-rate-types";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Utilisateur minimal requis par le tunnel de paiement. */
export interface CheckoutUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  level?: number | null;
}

/** Ligne de commande transmise à la Server Action `processCinetPayCheckout`. */
export interface CheckoutLineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

/**
 * Produit minimal lu depuis le panier Zustand.
 * Tous les champs métier sont optionnels : le panier peut provenir du
 * localStorage (données potentiellement anciennes ou corrompues).
 */
export interface CheckoutProductInput {
  id: string;
  name?: string | null;
  price?: number | null;
  basePriceUSD?: number | null;
  basePriceCDF?: number | null;
  discountPercent?: number | null;
  isAvailable?: boolean | null;
  stock?: number | null;
}

/** Ligne de panier minimale (structurellement compatible avec `CartItem`). */
export interface CheckoutCartLineInput {
  product?: CheckoutProductInput | null;
  quantity?: number | null;
}

export type CheckoutIssueReason =
  | "invalid"
  | "unavailable"
  | "out_of_stock"
  | "quantity"
  | "price";

export interface CheckoutIssue {
  id: string;
  name: string;
  reason: CheckoutIssueReason;
}

export interface CheckoutSummary {
  /** Lignes valides, prêtes pour la Server Action. */
  lines: CheckoutLineItem[];
  /** Lignes écartées ou ajustées (transparence côté UI). */
  issues: CheckoutIssue[];
  /** Somme `price * quantity` des lignes valides (même calcul que le serveur). */
  total: number;
  /** Nombre total d'articles payables. */
  totalQuantity: number;
  currency: DisplayCurrency;
}

/** Libellés humains des anomalies détectées dans le panier. */
export const CHECKOUT_ISSUE_LABELS: Record<CheckoutIssueReason, string> = {
  invalid: "article invalide",
  unavailable: "article indisponible",
  out_of_stock: "rupture de stock",
  quantity: "quantité ajustée au stock disponible",
  price: "prix indisponible",
};

/** Quantité maximale par ligne (aligné sur `MAX_CART_QUANTITY` du store). */
export const MAX_CHECKOUT_QUANTITY = 99;

/**
 * Numéros Mobile Money RDC : `+243 8XXXXXXXX`, `243 8XXXXXXXX` ou `08XXXXXXXX`.
 * Groupe capturé = 9 chiffres commençant par 8 ou 9.
 */
const CONGO_MOBILE_PHONE_PATTERN = /^(?:\+?243|0)([89]\d{8})$/;

// ─── 1. Utilisateur / session ────────────────────────────────────────────────

/**
 * Garde de type : la prop `user` est-elle exploitable pour un paiement ?
 * Empêche tout crash si la page appelante change de contrat ou si la session
 * est partiellement hydratée.
 */
export function isValidCheckoutUser(value: unknown): value is CheckoutUser {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as { id?: unknown; email?: unknown };

  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    typeof candidate.email === "string" &&
    candidate.email.trim().length > 0
  );
}

/** Nom affichable du client (repli sur la partie locale de l'e-mail). */
export function resolveCustomerName(user: CheckoutUser): string {
  const name = user.name?.trim();
  if (name) return name;

  const [localPart] = user.email.split("@");
  return localPart?.trim() || "Client";
}

/** Initiales pour l'avatar (max. 2 caractères, jamais vide). */
export function resolveUserInitials(user: CheckoutUser): string {
  const source = user.name?.trim() || user.email.trim();
  const parts = source.split(/[\s._-]+/).filter((part) => part.length > 0);

  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");

  return initials.toUpperCase() || "?";
}

// ── 2. Téléphone Mobile Money ───────────────────────────────────────────────

/**
 * Normalise un numéro Mobile Money congolais vers le format E.164 `+243XXXXXXXXX`.
 * @returns `null` si le numéro est absent ou invalide.
 */
export function normalizeMobileMoneyPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const compact = raw.replace(/[\s().-]/g, "");
  const match = CONGO_MOBILE_PHONE_PATTERN.exec(compact);

  return match ? `+243${match[1]}` : null;
}

// ─── 3. Panier → lignes de commande ──────────────────────────────────────────

/** Convertit une valeur inconnue en quantité entière bornée `[1, 99]` (0 si invalide). */
function resolveQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;

  const truncated = Math.trunc(value);
  if (truncated <= 0) return 0;

  return Math.min(truncated, MAX_CHECKOUT_QUANTITY);
}

/** Lit le stock disponible ; `null` si non renseigné (aucune contrainte). */
function resolveStock(product: CheckoutProductInput): number | null {
  const stock = product.stock;
  if (typeof stock !== "number" || !Number.isFinite(stock)) return null;

  return Math.max(0, Math.trunc(stock));
}

/**
 * Prix unitaire selon la devise d'affichage, réduction appliquée.
 * Même logique que `store/use-cart` → `getTotalPrice(currency)` :
 *   CDF : `basePriceCDF || price`, USD : `basePriceUSD || price`.
 * @returns `0` si le prix est inexploitable (la ligne sera écartée).
 */
export function resolveUnitPrice(
  product: CheckoutProductInput,
  currency: DisplayCurrency,
): number {
  const basePrice =
    currency === "CDF"
      ? product.basePriceCDF || product.price
      : product.basePriceUSD || product.price;

  if (
    typeof basePrice !== "number" ||
    !Number.isFinite(basePrice) ||
    basePrice <= 0
  ) {
    return 0;
  }

  const rawDiscount = product.discountPercent;
  const discountPercent =
    typeof rawDiscount === "number" && Number.isFinite(rawDiscount)
      ? Math.min(Math.max(rawDiscount, 0), 100)
      : 0;

  const discounted = basePrice * (1 - discountPercent / 100);

  return Number.isFinite(discounted) && discounted > 0 ? discounted : 0;
}

/**
 * Construit la liste des lignes payables à partir du panier Zustand.
 *
 * Robustesse :
 *  - ignore les entrées corrompues (localStorage) au lieu de propager `NaN` ;
 *  - écarte les articles indisponibles / en rupture de stock ;
 *  - borne les quantités (`1 → 99` et au stock disponible) ;
 *  - garantit un `total` fini, calculé EXACTEMENT comme la Server Action
 *    (`Σ price * quantity`), afin que CinetPay reçoive le bon montant.
 */
export function buildCheckoutSummary(
  items: readonly CheckoutCartLineInput[] | null | undefined,
  currency: DisplayCurrency,
): CheckoutSummary {
  const lines: CheckoutLineItem[] = [];
  const issues: CheckoutIssue[] = [];
  let total = 0;
  let totalQuantity = 0;

  for (const item of items ?? []) {
    const product = item?.product;

    if (!product || typeof product.id !== "string" || !product.id.trim()) {
      issues.push({ id: "", name: "Article inconnu", reason: "invalid" });
      continue;
    }

    const id = product.id;
    const name =
      typeof product.name === "string" && product.name.trim()
        ? product.name.trim()
        : "Article sans nom";

    const quantity = resolveQuantity(item?.quantity);
    if (quantity === 0) {
      issues.push({ id, name, reason: "quantity" });
      continue;
    }

    if (product.isAvailable === false) {
      issues.push({ id, name, reason: "unavailable" });
      continue;
    }

    const stock = resolveStock(product);
    if (stock === 0) {
      issues.push({ id, name, reason: "out_of_stock" });
      continue;
    }

    const payableQuantity =
      stock === null ? quantity : Math.min(quantity, stock);
    if (payableQuantity !== quantity) {
      issues.push({ id, name, reason: "quantity" });
    }

    const unitPrice = resolveUnitPrice(product, currency);
    if (unitPrice === 0) {
      issues.push({ id, name, reason: "price" });
      continue;
    }

    lines.push({ id, name, price: unitPrice, quantity: payableQuantity });

    total += unitPrice * payableQuantity;
    totalQuantity += payableQuantity;
  }

  return {
    lines,
    issues,
    total: Number.isFinite(total) ? total : 0,
    totalQuantity,
    currency,
  };
}
