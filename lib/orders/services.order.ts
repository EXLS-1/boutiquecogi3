// lib/services/order.service.ts
import {
  Currency,
  OrderStatusEnum,
  PaymentMethodType,
  PaymentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";

export interface CheckoutCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

function orderNumberFromDate(date = new Date()) {
  const year = date.getFullYear();
  const suffix = String(date.getTime()).slice(-6);
  return `COGI-${year}-${suffix}`;
}

async function resolveVariantId(productKey: string): Promise<string | null> {
  const bySku = await prisma.productVariant.findFirst({
    where: { sku: productKey },
    select: { id: true },
  });
  if (bySku) return bySku.id;

  const byProduct = await prisma.product.findFirst({
    where: { OR: [{ id: productKey }, { slug: productKey }] },
    include: { variants: { take: 1 } },
  });
  return byProduct?.variants[0]?.id ?? null;
}

/**
 * Valide et normalise une devise vers l'enum Prisma Currency.
 * @throws Error si la devise n'est pas USD ou CDF
 */
function normalizeCurrency(raw: string): Currency {
  const upper = raw.toUpperCase();
  if (upper === Currency.USD || upper === Currency.CDF) {
    return upper === Currency.USD ? Currency.USD : Currency.CDF;
  }
  throw new Error(`Devise invalide: ${raw}. Valeurs acceptées: USD, CDF`);
}

export async function createOrderFromCart(params: {
  userId: string;
  items: CheckoutCartItem[];
  currency: string;
  phone: string;
  cinetpayTransId: string;
}) {
  const { userId, items, currency, phone, cinetpayTransId } = params;

  if (!items.length) {
    throw new Error("Panier vide");
  }

  const normalizedCurrency = normalizeCurrency(currency);

  const lineItems: {
    variantId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    productId: string;
    productName: string;
    variantSku: string;
  }[] = [];

  for (const item of items) {
    const variantId = await resolveVariantId(item.id);
    if (!variantId) {
      throw new Error(`Produit introuvable: ${item.id}`);
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
if (!variant) {
      throw new Error(`Variante introuvable: ${item.id}`);
    }

    const unitPrice =
      variant.product.basePrice.toNumber() + variant.priceOffset;
    const subtotal = unitPrice * item.quantity;

    lineItems.push({
      variantId,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      productId: variant.productId,
      productName: variant.product.name,
      variantSku: variant.sku,
    });
  }

  const totalAmount = lineItems.reduce((sum, line) => sum + line.subtotal, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        id: generateUUIDv7(),
        orderNumber: orderNumberFromDate(),
        userId,
        status: OrderStatusEnum.PENDING,
        subtotalAmount: totalAmount,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: totalAmount,
        shippingCost: 0,
        totalAmount,
        currency: normalizedCurrency,
        cinetpayTransId,
        items: {
          create: lineItems.map((line) => ({
            id: generateUUIDv7(),
            productId: line.productId,
            variantId: line.variantId,
            productName: line.productName,
            variantSku: line.variantSku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
            currency: normalizedCurrency,
          })),
        },
payment: {
          create: {
            id: generateUUIDv7(),
            amount: totalAmount,
            currency: normalizedCurrency,
            status: PaymentStatus.PENDING,
            method: PaymentMethodType.CINETPAY,
            transactionId: cinetpayTransId,
          },
        },
        orderAddresses: {
          create: [
            {
              id: generateUUIDv7(),
              street: "",
              commune: "",
              city: "Kinshasa",
              country: "RDC",
              phone,
            },
          ],
        },
      },
      include: { items: true, payment: true },
    });

    for (const line of lineItems) {
      await tx.inventoryTransaction.create({
        data: {
          id: generateUUIDv7(),
          productId: line.productId,
          variantId: line.variantId,
          quantity: -line.quantity,
          reason: "SALE",
          referenceId: created.id,
        },
      });
    }

    return created;
  });

  return order;
}

export async function confirmOrderPayment(cinetpayTransId: string) {
  const order = await prisma.order.findFirst({
    where: { cinetpayTransId },
    include: { payment: true },
  });

  if (!order) {
    return null;
  }

  if (order.payment?.status === PaymentStatus.COMPLETED) {
    return order;
  }

  return prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatusEnum.CONFIRMED,
      payment: {
        update: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
        },
      },
    },
  });
}
