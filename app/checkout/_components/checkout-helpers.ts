// app/checkout/_components/checkout-helpers.ts
/**
 * =============================================================================
 * CHECKOUT HELPERS — Boutiquecogi3
 * =============================================================================
 * Helpers PURS (testables sans DOM ni serveur) propres au TUNNEL DE PAIEMENT :
 *
 *  1. Validation runtime de la prop `user` issue de la session Better-Auth.
 *  2. Identité affichable du client (nom, initiales).
 *  3. Normalisation des numéros Mobile Money (RDC : +243 / 0 + 8|9 XXXXXXXX).
 *  4. Redirection de connexion avec préservation de la destination.
 *
 * ⚠️ RÈGLE D'UNIFICATION : toute la logique PANIER (normalisation des
 * `CartItem`, prix par devise, stock, total, anomalies, charge utile serveur)
 * vit dans la source unique partagée `lib/cart/cart-domain`
 * (`buildCartSummary`, `resolveCartUnitPrice`, `formatCartAmount`,
 * `buildCartSyncPayload`…). Les adaptateurs ci-dessous DELEGUENT à ce domaine :
 * aucun calcul de prix / stock / quantité n'est dupliqué ici — la page panier,
 * le store, le tunnel de paiement et les écrans de commandes lisent donc
 * toujours le MÊME total, dans la MÊME devise.
 *
 * Contrainte : ce module ne dépend d'aucun runtime lourd (Prisma, zod,
 * next/headers), il reste donc importable côté client comme côté serveur.
 */

import {
  CART_ISSUE_LABELS,
  CART_ROUTES,
  buildCartSummary,
  buildSignInRedirect,
  formatCartAmount,
  resolveCartCurrency,
  resolveCartStock,
  resolveCartUnitPrice,
  type CartCurrency,
  type CartIssue,
  type CartLine,
  type CartLineInput,
} from "@/lib/cart/cart-domain";

// ─── 1. Utilisateur / session ────────────────────────────────────────────────

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
 * Totaux du tunnel : réexportés depuis le domaine panier pour éviter
 * toute redéfinition locale (`CartLine` / `CartIssue` restent canoniques).
 */
export type CheckoutLine = CartLine;
export type CheckoutCartInput = CartLineInput;
export type CheckoutProductInput = CartLineInput["product"];
export type CheckoutCartLineInput = CartLineInput;

export type CheckoutIssueReason = CartIssue["reason"];

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
  currency: CartCurrency;
}

/**
 * Libellés humains des anomalies détectées dans le panier.
 * Alias de `CART_ISSUE_LABELS` (domaine) : une seule table de libellés pour la
 * page panier, le checkout et les messages de synchronisation.
 */
export const CHECKOUT_ISSUE_LABELS: Record<CheckoutIssueReason, string> =
  CART_ISSUE_LABELS;

/** Quantité maximale par ligne (source unique : domaine panier). */
export { MAX_CART_QUANTITY as MAX_CHECKOUT_QUANTITY };

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

// ─── 3. Panier → lignes de commande (délégation au domaine) ────────────────────
// Toute la normalisation (quantité, stock, prix, déduplication, total) vit dans
// `lib/cart/cart-domain` → `buildCartSummary`. Les fonctions ci-dessous restent
// exportées pour compatibilité mais délèguent SANS dupliquer de calcul.

/**
 * Prix unitaire selon la devise d'affichage, remise appliquée.
 * Délègue à `resolveCartUnitPrice` (domaine) : MÊME résolution que le store,
 * la page panier et `buildCartSummary`.
 * @returns `0` si le prix est inexploitable (la ligne sera écartée).
 */
export function resolveUnitPrice(
  product: CheckoutProductInput,
  currency: CartCurrency,
): number {
  return resolveCartUnitPrice(product, resolveCartCurrency(currency));
}

/**
 * Construit la liste des lignes payables à partir du panier Zustand.
 *
 * Délègue à `buildCartSummary` : ignore les entrées corrompues, écarte les
 * indisponibles / ruptures, borne les quantités (`1 → MAX_CART_QUANTITY` et au
 * stock disponible), fusionne les doublons et calcule le total EXACTEMENT
 * comme la Server Action (`Σ price × quantity`).
 */
export function buildCheckoutSummary(
  items: readonly CheckoutCartLineInput[] | null | undefined,
  currency: CartCurrency,
): CheckoutSummary {
  const normalizedCurrency = resolveCartCurrency(currency);
  const summary = buildCartSummary(
    items as readonly CartLineInput[] | null | undefined,
    normalizedCurrency,
  );

  return {
    lines: summary.lines.map((line) => ({
      id: line.id,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
    })),
    issues: summary.issues.map((issue) => ({
      id: issue.id,
      name: issue.name,
      reason: issue.reason,
    })),
    total: summary.total,
    totalQuantity: summary.totalQuantity,
    currency: normalizedCurrency,
  };
}

// ─── 4. Redirection / navigation (délégation au domaine) ──────────────────────

/** Re-export : une seule construction d'URL de connexion (`callbackUrl`). */
export { buildSignInRedirect };

/**
 * Montant formaté du tunnel (`formatCartAmount` du domaine) : MÊME arrondi et
 * MÊME locale que la page panier, le badge et les écrans de commandes.
 */
export function formatCheckoutAmount(
  amount: number,
  currency: CartCurrency,
): string {
  return formatCartAmount(amount, resolveCartCurrency(currency));
}
