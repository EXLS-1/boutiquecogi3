// prisma/seed/factories/order.factory.ts
// ============================================
// GÉNÉRATEUR DE COMMANDES & ITEMS
// ============================================

import { OrderStatusEnum, Currency } from "@prisma/client";
import { generateDeterministicUuidV7 } from "../utils/uuid";
import { createSeededRandom, randInt } from "../utils/random";
import { usdCentsToCdf } from "../utils/currency";
import type { GeneratedVariant } from "./variant.factory";

export interface GeneratedOrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantSku: string;
  quantity: number;
  unitPrice: number; // cents
  subtotal: number; // cents
  currency: Currency;
}

export interface GeneratedOrder {
  id: string;
  orderNumber: string;
  userId: string | null;
  status: OrderStatusEnum;
  subtotalAmount: number; // cents
  taxAmount: number; // cents
  discountAmount: number; // cents
  grandTotal: number; // cents
  shippingCost: number; // cents
  totalAmount: number; // cents
  currency: Currency;
  createdAt: Date;
  items: GeneratedOrderItem[];
}

const STATUSES: OrderStatusEnum[] = [
  OrderStatusEnum.PENDING,
  OrderStatusEnum.CONFIRMED,
  OrderStatusEnum.PROCESSING,
  OrderStatusEnum.SHIPPED,
  OrderStatusEnum.DELIVERED,
  OrderStatusEnum.CANCELLED,
  OrderStatusEnum.REFUNDED,
];

const TAX_RATE = 0.16;
const SHIPPING_COST = 500; // cents (5 USD)

export interface BuildOrderOptions {
  userId: string | null;
  variants: GeneratedVariant[];
  productIds: string[];
  productNames: string[];
  status?: OrderStatusEnum;
  seedNumber: number;
}

/**
 * Construit une commande avec 1-3 items, calculs précis (entiers).
 * Le statut est déterministe via l'index.
 */
export function buildOrderFactory(
  index: number,
  options: BuildOrderOptions,
): GeneratedOrder {
  const orderId = generateDeterministicUuidV7("order", index);
  const orderNumber = `BC3-2026-${String(index + 1).padStart(6, "0")}`;
  const rand = createSeededRandom(options.seedNumber, "order", index);

  const itemCount = randInt(rand, 1, 3);
  const currency: Currency = index % 2 === 0 ? "USD" : "CDF";

  const items: GeneratedOrderItem[] = [];
  let subtotal = 0;

  for (let i = 0; i < itemCount; i++) {
    const variant = options.variants[(index + i) % options.variants.length];
    const quantity = randInt(rand, 1, 3);
    const unitPrice = Number(variant.priceUSD) * 100; // string USD -> cents
    const lineSubtotal = Math.round(unitPrice * quantity);
    subtotal += lineSubtotal;

    items.push({
      id: generateDeterministicUuidV7("order_item", index * 10 + i),
      orderId,
      productId: options.productIds[(index + i) % options.productIds.length],
      variantId: variant.id,
      productName: options.productNames[(index + i) % options.productNames.length],
      variantSku: variant.sku,
      quantity,
      unitPrice: Math.round(unitPrice),
      subtotal: lineSubtotal,
      currency,
    });
  }

  const taxAmount = Math.round(subtotal * TAX_RATE);
  const discountAmount = index % 5 === 0 ? Math.round(subtotal * 0.1) : 0;
  const shippingCost = subtotal > 5000 ? 0 : SHIPPING_COST;
  const grandTotal = subtotal + taxAmount + shippingCost - discountAmount;

  const status = options.status ?? STATUSES[index % STATUSES.length];

  return {
    id: orderId,
    orderNumber,
    userId: options.userId,
    status,
    subtotalAmount: subtotal,
    taxAmount,
    discountAmount,
    grandTotal,
    shippingCost,
    totalAmount: grandTotal,
    currency,
    createdAt: new Date(Date.now() - (index + 1) * 14400000),
    items,
  };
}

/** Convertit un total cents vers CDF (pour cohérence multi-devise). */
export function orderTotalCdf(totalUsdCents: number): number {
  return usdCentsToCdf(totalUsdCents);
}
