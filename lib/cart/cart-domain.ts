// lib/cart/cart-domain.ts
/**
 * =============================================================================
 * CART DOMAIN — Boutiquecogi3 (source de vérité unique du panier)
 * =============================================================================
 * Ce module centralise TOUTE la logique métier du panier, partagée par :
 *
 *   • `store/use-cart.ts`                        → store Zustand (état + actions)
 *   • `components/cart/cart-badge.tsx`           → compteur d'articles
 *   • `components/cart/cart-icon.tsx`            → route + libellés accessibles
 *   • `components/cart/cart-sync-manager.tsx`    → synchronisation serveur
 *   • `app/cart/page.tsx`                        → page panier
 *   • `app/checkout/**`                          → tunnel de paiement
 *   • `app/orders/**`, `app/admin/**`            → suivi des commandes / stock
 *
 * RÈGLES DE CONCEPTION
 * --------------------
 * 1. Module PUR : aucun import RUNTIME de React / Prisma / serveur. Les seuls
 *    imports sont des types (`import type`) et `@/lib/utils/currency` (helpers
 *    monétaires purs, déjà utilisés côté client). Il est donc utilisable dans un
 *    Server Component, un Client Component et dans les tests Vitest.
 * 2. Aucune donnée `NaN` / `undefined` ne doit pouvoir sortir d'ici : toute
 *    entrée (localStorage corrompu, produit partiel…) est validée puis bornée.
 * 3. Convention monétaire : les montants manipulés sont en **unités majeures**
 *    de la devise (`25.5` = 25,50 USD ou 25,50 CDF), conformément au store, au
 *    tunnel CinetPay et aux colonnes `Order.totalAmount` / `OrderItem.unitPrice`.
 *    La précision d'arrondi suit la devise (CDF → 0 décimale, USD → 2).
 */

import { formatCurrency, roundToFinancial } from "@/lib/utils/currency";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Devises supportées par le panier (alignée sur l'enum Prisma `Currency`). */
export type CartCurrency = "USD" | "CDF";

/**
 * Raison d'exclusion / d'ajustement d'une ligne de panier.
 * Utilisée par l'UI pour expliquer pourquoi un article n'est pas payable.
 */
export type CartIssueReason =
  | "invalid"
  | "unavailable"
  | "out_of_stock"
  | "quantity"
  | "price";

/** Produit minimal lu depuis le panier (potentiellement partiel ou corrompu). */
export interface CartProductInput {
  id?: string | null;
  name?: string | null;
  image?: string | null;
  price?: number | null;
  basePrice?: number | null;
  basePriceUSD?: number | null;
  basePriceCDF?: number | null;
  discountPercent?: number | null;
  isAvailable?: boolean | null;
  stock?: number | null;
}

/** Ligne de panier minimale (structurellement compatible avec `CartItem`). */
export interface CartLineInput {
  product?: CartProductInput | null;
  quantity?: number | null;
}

/** Ligne de panier normalisée : seule forme consommée par l'UI et le serveur. */
export interface CartLine {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  /** Prix unitaire en unités majeures, remise appliquée, arrondi devise. */
  readonly price: number;
  readonly quantity: number;
}

/** Anomalie détectée lors de la normalisation du panier. */
export interface CartIssue {
  readonly id: string;
  readonly name: string;
  readonly reason: CartIssueReason;
}

/** Résultat complet et cohérent d'une lecture du panier. */
export interface CartSummary {
  /** Lignes valides et payables (dédupliquées, quantités bornées). */
  readonly lines: readonly CartLine[];
  /** Lignes écartées ou ajustées (transparence côté UI). */
  readonly issues: readonly CartIssue[];
  /** `Σ price × quantity` des lignes valides (même calcul que le serveur). */
  readonly total: number;
  /** Nombre total d'articles payables. */
  readonly totalQuantity: number;
  readonly currency: CartCurrency;
  /** Panier non vide ET montant strictement positif. */
  readonly isPayable: boolean;
}

/**
 * Ligne envoyée à `syncCartAction` (miroir serveur du panier).
 * Contrat EXACT validé par `SyncCartSchema`.
 */
export interface CartSyncItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

/** Niveaux de stock exposés par la table `Stock` (`available = quantity - reserved`). */
export interface StockLevels {
  quantity?: number | null;
  reserved?: number | null;
  alertThreshold?: number | null;
}

// ─── Constantes partagées ────────────────────────────────────────────────────

/** Quantité maximale par ligne de panier (borne métier unique). */
export const MAX_CART_QUANTITY = 99;

/** Clé localStorage du panier persisté (store Zustand `persist`). */
export const CART_STORAGE_KEY = "boutiquecogi3_cart";

/** Image de repli quand un produit du panier n'a pas d'image exploitable. */
export const CART_IMAGE_FALLBACK = "/placeholder.webp";

/**
 * Routes du parcours panier → commande.
 * Source unique : évite les liens morts (`/account/orders` n'existe pas — la
 * page réelle est `app/orders/account/orders/page.tsx`).
 */
export const CART_ROUTES = {
  cart: "/cart",
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
  checkoutCancel: "/checkout/cancel",
  products: "/products",
  signIn: "/auth/sign-in",
  /** Historique des commandes du client (routes réelles). */
  accountOrders: "/orders/account/orders",
  orders: "/orders",
  /** Gestion des commandes (côté administration, route réelle). */
  adminOrders: "/admin/order",
  /** Gestion des stocks (côté administration, route réelle). */
  adminStock: "/admin/stock",
} as const;

/** Construit l'URL de connexion en préservant la destination (`callbackUrl`). */
export function buildSignInRedirect(callbackUrl: string): string {
  const target = callbackUrl.startsWith("/") ? callbackUrl : `/${callbackUrl}`;
  return `${CART_ROUTES.signIn}?callbackUrl=${encodeURIComponent(target)}`;
}

/** Libellés du panier (source unique pour l'UI et l'accessibilité). */
export const CART_LABELS = {
  cart: "Panier",
  pageTitle: "Votre Panier",
  viewCart: "Voir le panier",
  checkout: "Finaliser ma commande",
  empty: "Votre panier est actuellement vide.",
  total: "Total estimé",
  clearCart: "Vider le panier",
  backToShop: "Retour à la boutique",
} as const;

/** Libellés humains des anomalies détectées dans le panier. */
export const CART_ISSUE_LABELS: Record<CartIssueReason, string> = {
  invalid: "article invalide",
  unavailable: "article indisponible",
  out_of_stock: "rupture de stock",
  quantity: "quantité ajustée au stock disponible",
  price: "prix indisponible",
};

/** Pluralisation du nombre d'articles (`1 article` / `2 articles`). */
export function formatCartItemCount(count: number): string {
  const safeCount = Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
  return `${safeCount} article${safeCount > 1 ? "s" : ""}`;
}

/** Libellé accessible du badge / de l'icône panier. */
export function formatCartBadgeLabel(count: number): string {
  return `${formatCartItemCount(count)} dans le panier`;
}

/** Compteur compact du badge (`150` → `99+`, jamais négatif). */
export function formatCartBadgeCount(count: number): string {
  const safeCount =
    Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;

  return safeCount > MAX_CART_QUANTITY
    ? `${MAX_CART_QUANTITY}+`
    : String(safeCount);
}

// ─── Primitives (quantités, arrondis, stock) ─────────────────────────────────

/** Normalise une devise inconnue vers une devise supportée (défaut : USD). */
export function resolveCartCurrency(value: unknown): CartCurrency {
  return typeof value === "string" && value.toUpperCase() === "CDF"
    ? "CDF"
    : "USD";
}

/** Nombre de décimales d'affichage / d'arrondi d'une devise. */
export function getCurrencyPrecision(currency: CartCurrency): 0 | 2 {
  return currency === "CDF" ? 0 : 2;
}

/** Arrondi monétaire déterministe selon la devise (anti-dérive IEEE 754). */
export function roundCartAmount(amount: number, currency: CartCurrency): number {
  if (!Number.isFinite(amount)) return 0;
  return roundToFinancial(amount, getCurrencyPrecision(currency));
}

/**
 * Borne une quantité brute : `0` si inexploitable, sinon entier de `1` à `max`.
 * `0` est la sentinelle « ligne à écarter » utilisée par `buildCartSummary`.
 */
export function clampCartQuantity(
  value: unknown,
  max: number = MAX_CART_QUANTITY,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;

  const truncated = Math.trunc(value);
  if (truncated <= 0) return 0;

  const ceiling = Math.max(1, Math.trunc(max));
  return Math.min(truncated, ceiling);
}

/**
 * Quantité disponible = `quantity - reserved`, jamais négative.
 * Règle unique dérivée du schéma Prisma (`available = quantity - reserved`).
 */
export function resolveAvailableStock(
  levels: StockLevels | null | undefined,
): number {
  if (!levels) return 0;

  const quantity = toSafeInteger(levels.quantity);
  const reserved = toSafeInteger(levels.reserved);

  return Math.max(0, quantity - reserved);
}

/**
 * Stock exploitable d'un produit du panier.
 * `null` = stock non renseigné → aucune contrainte de quantité.
 */
export function resolveCartStock(
  product: CartProductInput | null | undefined,
): number | null {
  const stock = product?.stock;
  if (typeof stock !== "number" || !Number.isFinite(stock)) return null;

  return Math.max(0, Math.trunc(stock));
}

/** Seuil d'alerte atteint (stock disponible ≤ seuil ; défaut : 10). */
export function isLowStock(
  levels: StockLevels | null | undefined,
  defaultThreshold = 10,
): boolean {
  const threshold = toSafeInteger(levels?.alertThreshold ?? defaultThreshold);
  return resolveAvailableStock(levels) <= threshold;
}

/** Rupture de stock (aucune unité disponible). */
export function isOutOfStock(levels: StockLevels | null | undefined): boolean {
  return resolveAvailableStock(levels) <= 0;
}

// ─── Prix ────────────────────────────────────────────────────────────────────

/**
 * Prix unitaire selon la devise d'affichage, remise appliquée.
 *
 * Même résolution que `store/use-cart` → `getTotalPrice(currency)` :
 *   CDF : `basePriceCDF || price`, USD : `basePriceUSD || price`.
 *
 * @returns `0` si le prix est inexploitable (la ligne sera écartée).
 */
export function resolveCartUnitPrice(
  product: CartProductInput | null | undefined,
  currency: CartCurrency,
): number {
  if (!product) return 0;

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

  const discounted = roundCartAmount(
    basePrice * (1 - discountPercent / 100),
    currency,
  );

  return discounted > 0 ? discounted : 0;
}

/**
 * Prix « miroir » envoyé au serveur pour la synchronisation : prix catalogue,
 * remise NON appliquée (le serveur reste maître du calcul des remises).
 * @returns `0` si aucun prix exploitable.
 */
export function resolveCartMirrorPrice(
  product: CartProductInput | null | undefined,
): number {
  const candidates = [product?.price, product?.basePriceUSD, product?.basePrice];

  for (const candidate of candidates) {
    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > 0
    ) {
      return roundCartAmount(candidate, "USD");
    }
  }

  return 0;
}

// ─── Normalisation ───────────────────────────────────────────────────────────

/** Convertisseur interne : valeur inconnue → entier fini (0 si inexploitable). */
function toSafeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

/** Accumule une ligne valide en fusionnant les doublons de `product.id`. */
function upsertLine(
  store: Map<string, CartLine>,
  line: CartLine,
  maxQuantity: number,
): void {
  const existing = store.get(line.id);

  if (!existing) {
    store.set(line.id, line);
    return;
  }

  // Doublon (localStorage corrompu / fusion multi-onglets) : addition bornée.
  store.set(line.id, {
    ...existing,
    quantity: clampCartQuantity(existing.quantity + line.quantity, maxQuantity),
  });
}

/**
 * Construit le résumé EXACT du panier : lignes payables, anomalies, total.
 *
 * Robustesse :
 *  - ignore les entrées corrompues (localStorage) au lieu de propager `NaN` ;
 *  - déduplique les lignes partageant le même `product.id` ;
 *  - écarte les articles indisponibles / en rupture de stock ;
 *  - borne les quantités (`1 → 99` et au stock disponible) ;
 *  - garantit un `total` fini, calculé EXACTEMENT comme la Server Action
 *    (`Σ price × quantity`), afin que CinetPay reçoive le bon montant.
 */
export function buildCartSummary(
  items: readonly CartLineInput[] | null | undefined,
  currency: CartCurrency = "USD",
): CartSummary {
  const safeCurrency = resolveCartCurrency(currency);
  const linesById = new Map<string, CartLine>();
  const issues: CartIssue[] = [];
  let total = 0;
  let totalQuantity = 0;

  for (const item of items ?? []) {
    const product = item?.product;
    const rawId = product?.id;

    if (typeof rawId !== "string" || !rawId.trim()) {
      issues.push({ id: "", name: "Article inconnu", reason: "invalid" });
      continue;
    }

    const id = rawId.trim();
    const name =
      typeof product?.name === "string" && product.name.trim()
        ? product.name.trim()
        : "Article sans nom";

    const quantity = clampCartQuantity(item?.quantity);
    if (quantity === 0) {
      issues.push({ id, name, reason: "quantity" });
      continue;
    }

    if (product?.isAvailable === false) {
      issues.push({ id, name, reason: "unavailable" });
      continue;
    }

    const stock = resolveCartStock(product);
    if (stock === 0) {
      issues.push({ id, name, reason: "out_of_stock" });
      continue;
    }

    const payableQuantity = stock === null ? quantity : Math.min(quantity, stock);
    if (payableQuantity !== quantity) {
      issues.push({ id, name, reason: "quantity" });
    }

    const unitPrice = resolveCartUnitPrice(product, safeCurrency);
    if (unitPrice === 0) {
      issues.push({ id, name, reason: "price" });
      continue;
    }

    const image =
      typeof product?.image === "string" && product.image.trim()
        ? product.image.trim()
        : CART_IMAGE_FALLBACK;

    upsertLine(
      linesById,
      { id, name, image, price: unitPrice, quantity: payableQuantity },
      Math.min(MAX_CART_QUANTITY, stock ?? MAX_CART_QUANTITY),
    );
  }

  const lines = [...linesById.values()];

  for (const line of lines) {
    total += line.price * line.quantity;
    totalQuantity += line.quantity;
  }

  const safeTotal = roundCartAmount(total, safeCurrency);

  return {
    lines,
    issues,
    total: safeTotal,
    totalQuantity,
    currency: safeCurrency,
    isPayable: lines.length > 0 && safeTotal > 0,
  };
}

/** Lignes normalisées uniquement (`buildCartSummary(...).lines`). */
export function toCartLines(
  items: readonly CartLineInput[] | null | undefined,
  currency: CartCurrency = "USD",
): CartLine[] {
  return [...buildCartSummary(items, currency).lines];
}

/** Total d'un ensemble de lignes normalisées (source unique du montant). */
export function sumCartLinesTotal(
  lines: readonly CartLine[] | null | undefined,
  currency: CartCurrency = "USD",
): number {
  const safeCurrency = resolveCartCurrency(currency);
  const total = (lines ?? []).reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );

  return roundCartAmount(total, safeCurrency);
}

/** Nombre total d'articles d'un ensemble de lignes normalisées. */
export function sumCartLinesQuantity(
  lines: readonly CartLine[] | null | undefined,
): number {
  return (lines ?? []).reduce(
    (sum, line) => sum + clampCartQuantity(line.quantity),
    0,
  );
}

/**
 * Total d'un panier brut : `Σ prix unitaire × quantité` sur TOUTES les entrées
 * (une entrée sans prix exploitable contribue `0`).
 * Utilisé par `store/use-cart` → `getTotalPrice(currency)` (estimation).
 *
 * Pour le montant réellement payable (articles indisponibles/rupture écartés),
 * utiliser `buildCartSummary(...).total`.
 */
export function sumCartItemsTotal(
  items: readonly CartLineInput[] | null | undefined,
  currency: CartCurrency = "USD",
): number {
  const safeCurrency = resolveCartCurrency(currency);
  const total = (items ?? []).reduce((sum, item) => {
    const unitPrice = resolveCartUnitPrice(item?.product, safeCurrency);
    const quantity = clampCartQuantity(item?.quantity);

    return sum + unitPrice * quantity;
  }, 0);

  return roundCartAmount(total, safeCurrency);
}

/**
 * Nombre total d'articles d'un panier brut (quantités bornées).
 * Compte ce que l'utilisateur voit dans son panier, y compris les articles
 * momentanément indisponibles (le badge ne doit jamais « perdre » une ligne).
 */
export function sumCartItemsQuantity(
  items: readonly CartLineInput[] | null | undefined,
): number {
  return (items ?? []).reduce(
    (sum, item) => sum + clampCartQuantity(item?.quantity),
    0,
  );
}

// ─── Signature & synchronisation ─────────────────────────────────────────────

/** Clé stable `id:quantité|…` (+ tri) décrivant l'état « métier » du panier. */
function toSignature(
  entries: readonly { id: string; quantity: number }[],
): string {
  return entries
    .filter((entry) => entry.id.length > 0 && entry.quantity > 0)
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((entry) => `${entry.id}:${entry.quantity}`)
    .join("|");
}

/**
 * Signature d'un panier brut (tolérante aux entrées corrompues).
 * Deux signatures identiques ⇒ aucune synchronisation réseau nécessaire.
 */
export function cartItemsSignature(
  items: readonly CartLineInput[] | null | undefined,
): string {
  return toSignature(
    (items ?? []).map((item) => ({
      id: typeof item?.product?.id === "string" ? item.product.id.trim() : "",
      quantity: clampCartQuantity(item?.quantity),
    })),
  );
}

/** Signature d'un ensemble de lignes normalisées. */
export function cartLinesSignature(
  lines: readonly CartLine[] | null | undefined,
): string {
  return toSignature(
    (lines ?? []).map((line) => ({ id: line.id, quantity: line.quantity })),
  );
}

/**
 * Construit la charge utile de `syncCartAction` (miroir serveur du panier).
 *
 * Les entrées inexploitables sont écartées : le schéma Zod serveur
 * (`SyncCartSchema`) ne doit jamais recevoir de `NaN`, de chaîne vide ni de
 * doublon (`@@unique([cartId, variantId])`).
 */
export function buildCartSyncPayload(
  items: readonly CartLineInput[] | null | undefined,
): CartSyncItem[] {
  const payloadById = new Map<string, CartSyncItem>();

  for (const item of items ?? []) {
    const product = item?.product;
    const rawId = product?.id;

    if (typeof rawId !== "string" || !rawId.trim()) continue;

    const id = rawId.trim();
    const quantity = clampCartQuantity(item?.quantity);
    if (quantity === 0) continue;

    const price = resolveCartMirrorPrice(product);
    if (price <= 0) continue;

    const name =
      typeof product?.name === "string" && product.name.trim()
        ? product.name.trim()
        : "Article sans nom";
    const image =
      typeof product?.image === "string" && product.image.trim()
        ? product.image.trim()
        : CART_IMAGE_FALLBACK;

    const existing = payloadById.get(id);
    payloadById.set(id, {
      id,
      name,
      image,
      price,
      quantity: clampCartQuantity(quantity + (existing?.quantity ?? 0)),
    });
  }

  // Ordre déterministe : payloads identiques ⇒ requêtes identiques.
  return [...payloadById.values()].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
}

// ─── Garde-fou panier → quantités ────────────────────────────────────────────

/**
 * Quantité maximale commandable pour une ligne (borne globale ET stock).
 * Page panier, store et checkout partagent cette règle unique.
 */
export function getCartLineMaxQuantity(stock?: number | null): number {
  if (typeof stock !== "number" || !Number.isFinite(stock) || stock < 0) {
    return MAX_CART_QUANTITY;
  }
  return Math.min(MAX_CART_QUANTITY, Math.floor(stock));
}

/** Nom du cookie de persistance de la devise d'affichage. */
export const DISPLAY_CURRENCY_COOKIE = "displayCurrency";

// ─── Commandes — présentation unifiée ────────────────────────────────────────
// `Order.*Amount` / `OrderItem.unitPrice` sont des `Int` Prisma en **unités
// mineures** (centimes) ; le panier manipule des unités majeures.

/** Statuts de commande (miroir de l'enum Prisma `OrderStatusEnum`). */
export type CartOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

/** Statuts de paiement (miroir de l'enum Prisma `PaymentStatus`). */
export type CartPaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

/** Libellés FR d'affichage des statuts de commande (même texte partout). */
export const ORDER_STATUS_LABELS: Record<CartOrderStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PROCESSING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

/** Libellés FR d'affichage des statuts de paiement. */
export const ORDER_PAYMENT_LABELS: Record<CartPaymentStatus, string> = {
  PENDING: "En attente",
  COMPLETED: "Payée",
  FAILED: "Échouée",
  REFUNDED: "Remboursée",
};

/** Teinte UI associée à un statut (`Badge` shadcn). */
export type OrderStatusTone = "default" | "secondary" | "destructive" | "outline";

export const ORDER_STATUS_TONES: Record<CartOrderStatus, OrderStatusTone> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  PROCESSING: "default",
  SHIPPED: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
  REFUNDED: "outline",
};

/** Transitions autorisées du cycle de vie commande (garde-fou admin). */
export const ORDER_STATUS_TRANSITIONS: Record<CartOrderStatus, CartOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

function normalizeOrderStatus(raw: unknown): CartOrderStatus | null {
  if (typeof raw !== "string") return null;
  const upper = raw.trim().toUpperCase() as CartOrderStatus;
  return upper in ORDER_STATUS_LABELS ? upper : null;
}

function normalizePaymentStatus(raw: unknown): CartPaymentStatus | null {
  if (typeof raw !== "string") return null;
  const upper = raw.trim().toUpperCase() as CartPaymentStatus;
  return upper in ORDER_PAYMENT_LABELS ? upper : null;
}

/** Libellé FR d'un statut de commande (tolérant aux données inconnues). */
export function getOrderStatusLabel(status: unknown): string {
  const normalized = normalizeOrderStatus(status);
  return normalized ? ORDER_STATUS_LABELS[normalized] : "—";
}

/** Teinte `Badge` d'un statut de commande (fallback sûr). */
export function getOrderStatusTone(status: unknown): OrderStatusTone {
  const normalized = normalizeOrderStatus(status);
  return normalized ? ORDER_STATUS_TONES[normalized] : "secondary";
}

/** Libellé FR d'un statut de paiement (tolérant aux données inconnues). */
export function getOrderPaymentLabel(status: unknown): string {
  const normalized = normalizePaymentStatus(status);
  return normalized ? ORDER_PAYMENT_LABELS[normalized] : "—";
}

/** `true` si le statut est terminal (aucune transition possible). */
export function isOrderTerminalStatus(status: unknown): boolean {
  const normalized = normalizeOrderStatus(status);
  if (!normalized) return false;
  return ORDER_STATUS_TRANSITIONS[normalized].length === 0;
}

/** Garde-fou de transition admin : `to` atteignable depuis `from` ? */
export function canTransitionOrderStatus(from: unknown, to: unknown): boolean {
  const source = normalizeOrderStatus(from);
  const target = normalizeOrderStatus(to);
  if (!source || !target) return false;
  return ORDER_STATUS_TRANSITIONS[source].includes(target);
}

/** Convertit des centimes (`Int` Prisma) en unités majeures (jamais `NaN`). */
export function toMajorAmount(amountMinor: unknown): number {
  const minor =
    typeof amountMinor === "number" && Number.isFinite(amountMinor)
      ? amountMinor
      : 0;
  return minor / 100;
}

/** Formate un montant de commande (centimes) dans sa devise. */
export function formatOrderAmountMinor(
  amountMinor: unknown,
  currency: CartCurrency | string | null | undefined = "USD",
): string {
  return formatCartAmount(
    toMajorAmount(amountMinor),
    resolveCartCurrency(currency),
  );
}

// ─── Stocks — présentation unifiée (admin ↔ panier) ───────────────────────────
// Le panier lit `resolveCartStock` ; l'admin lit `quantity - reserved`.
// Même sémantique « disponible / bas / épuisé » des deux côtés.

/** Statut synthétique d'un stock. */
export type StockLevel = "out" | "low" | "ok";

/** Libellés FR des niveaux de stock. */
export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  out: "Rupture",
  low: "Stock bas",
  ok: "En stock",
};

/** Quantité réellement disponible (`quantity - reserved`, jamais négative). */
export function getStockAvailable(
  quantity: unknown,
  reserved: unknown = 0,
): number {
  const q =
    typeof quantity === "number" && Number.isFinite(quantity) ? quantity : 0;
  const r =
    typeof reserved === "number" && Number.isFinite(reserved) ? reserved : 0;
  return Math.max(0, Math.floor(q) - Math.floor(r));
}

/** Niveau de stock à partir du disponible et du seuil d'alerte. */
export function getStockLevel(
  available: unknown,
  alertThreshold: unknown = 0,
): StockLevel {
  const safeAvailable =
    typeof available === "number" && Number.isFinite(available) ? available : 0;
  const threshold =
    typeof alertThreshold === "number" && Number.isFinite(alertThreshold)
      ? alertThreshold
      : 0;
  if (safeAvailable <= 0) return "out";
  if (safeAvailable <= threshold) return "low";
  return "ok";
}

/** `true` si le stock est épuisé. */
export function isStockOut(available: unknown): boolean {
  return getStockLevel(available, Number.POSITIVE_INFINITY) === "out";
}

/** `true` si le stock est bas ou épuisé (seuil d'alerte atteint). */
export function isStockLow(
  available: unknown,
  alertThreshold: unknown,
): boolean {
  return getStockLevel(available, alertThreshold) !== "ok";
}

/** Devise d'une commande (tolérante : fallback `USD`). */
export function resolveOrderCurrency(raw: unknown): CartCurrency {
  return resolveCartCurrency(typeof raw === "string" ? raw : undefined);
}

/** Nombre d'articles d'une commande (tolérant aux `items` absents). */
export function getOrderItemsCount(order: {
  items?: readonly unknown[] | null;
}): number {
  return Array.isArray(order?.items) ? order.items.length : 0;
}

// ─── Formatage ───────────────────────────────────────────────────────────────

/** Formate un montant du panier (arrondi devise puis formatage localisé). */
export function formatCartAmount(
  amount: number,
  currency: CartCurrency = "USD",
): string {
  const safeCurrency = resolveCartCurrency(currency);
  return formatCurrency(roundCartAmount(amount, safeCurrency), {
    currency: safeCurrency,
  });
}

