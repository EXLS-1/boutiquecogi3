import { Prisma, type CatalogProduct, type Product, type ProductPrice } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  MoneyCents,
  PriceContext,
  PriceLayer,
  PriceSource,
  ResolvedPrice,
} from "./pricing.types";

type PricingProduct = Product & {
  productPrice: ProductPrice[];
  catalogs: CatalogProduct[];
};

export function toCents(value: Prisma.Decimal | number | string): MoneyCents {
  const amount = value instanceof Prisma.Decimal
    ? value.toNumber()
    : typeof value === "string"
      ? Number(value)
      : value;
  if (!Number.isFinite(amount)) throw new TypeError("Le montant doit etre un nombre fini");
  const cents = Math.round(amount * 100);
  // Les montants doivent rester des entiers sûrs : au-delà, l'arrondi
  // perd des centimes silencieusement (ex. Decimal("1e15")).
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Montant hors borne sure : ${amount}`);
  }
  return cents;
}

function isWindowActive(startsAt: Date | null, endsAt: Date | null, at: Date): boolean {
  return (!startsAt || startsAt <= at) && (!endsAt || endsAt >= at);
}

function isGeoMatch(
  country: string | null,
  region: string | null,
  context: PriceContext,
): boolean {
  if (country && country !== context.country) return false;
  if (region && region !== context.region) return false;
  return true;
}

function geoSpecificity(price: ProductPrice): number {
  return Number(price.country !== null) + Number(price.region !== null);
}

function isBasePrice(price: ProductPrice): boolean {
  return price.country === null && price.region === null && price.startsAt === null && price.endsAt === null;
}

/** Resolve catalog override first, then the best applicable ProductPrice row. */
export function resolvePriceFromProduct(
  product: PricingProduct,
  context: PriceContext = {},
): ResolvedPrice {
  const at = context.at ?? new Date();
  const currency = context.currency ?? product.currency;
  const layers: PriceLayer[] = [];

  const catalog = context.catalogId
    ? product.catalogs.find((entry) => entry.catalogId === context.catalogId && entry.isActive)
    : undefined;
  const catalogOverride = catalog?.priceOverride == null ? null : toCents(catalog.priceOverride);
  layers.push({
    source: "CATALOG_OVERRIDE",
    amount: catalogOverride,
    matched: catalogOverride !== null,
    ...(catalog ? { detail: `catalogue ${catalog.catalogId}` } : {}),
  });

  const matchingPrices = product.productPrice
    .filter((price) =>
      price.currency === currency &&
      isWindowActive(price.startsAt, price.endsAt, at) &&
      isGeoMatch(price.country, price.region, context),
    )
    .sort((a, b) =>
      geoSpecificity(b) - geoSpecificity(a) ||
      (b.startsAt?.getTime() ?? 0) - (a.startsAt?.getTime() ?? 0) ||
      a.id.localeCompare(b.id),
    );

  const selectedPrice = matchingPrices[0];
  const amount = selectedPrice ? toCents(selectedPrice.amount) : null;
  const source: PriceSource = selectedPrice && !isBasePrice(selectedPrice)
    ? "PRODUCT_PRICE"
    : "BASE_PRICE";
  layers.push({
    source: "PRODUCT_PRICE",
    amount,
    matched: selectedPrice !== undefined,
    ...(selectedPrice ? {
      detail: `currency=${selectedPrice.currency}; geo=${selectedPrice.country ?? "*"}/${selectedPrice.region ?? "*"}`,
    } : {}),
  });
  layers.push({ source: "SALE_PRICE", amount: null, matched: false });
  layers.push({ source: "BASE_PRICE", amount: source === "BASE_PRICE" ? amount : null, matched: source === "BASE_PRICE" && amount !== null });

  const resolvedAmount = catalogOverride ?? amount ?? 0;
  const compareCandidate = selectedPrice?.compareAtPrice ?? null;
  const compareAtPrice = catalogOverride !== null
    ? (amount !== null && amount > catalogOverride ? amount : null)
    : compareCandidate !== null && compareCandidate > resolvedAmount
      ? compareCandidate
      : null;

  const winner: PriceSource = catalogOverride !== null ? "CATALOG_OVERRIDE" : source;
  return { amount: resolvedAmount, compareAtPrice, source: winner, layers };
}

export async function resolveProductPrice(
  productId: string,
  context: PriceContext = {},
): Promise<ResolvedPrice> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { productPrice: true, catalogs: true },
  });
  if (!product) throw new Error(`PRICING_PRODUCT_NOT_FOUND: ${productId}`);
  return resolvePriceFromProduct(product, context);
}

/** Validate ProductPrice rows without depending on removed Product price columns. */
export function validatePricingRules(
  input: { productPrice?: Pick<ProductPrice, "amount" | "compareAtPrice" | "startsAt" | "endsAt">[] },
): string[] {
  const errors: string[] = [];
  for (const price of input.productPrice ?? []) {
    if (price.amount.lessThanOrEqualTo(0)) errors.push("Un prix produit doit etre superieur a zero");
    if (price.compareAtPrice !== null && price.compareAtPrice <= toCents(price.amount)) {
      errors.push("Le prix compare doit etre superieur au montant du prix");
    }
    if (price.startsAt && price.endsAt && price.endsAt <= price.startsAt) {
      errors.push("La fenetre de validite du prix est invalide");
    }
  }
  return errors;
}
