import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/uuid";

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

  const lineItems: {
    variantId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    productId: string;
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

    const unitPrice = variant.product.basePrice + variant.priceOffset;
    const subtotal = unitPrice * item.quantity;

    lineItems.push({
      variantId,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      productId: variant.productId,
    });
  }

  const totalAmount = lineItems.reduce((sum, line) => sum + line.subtotal, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        id: generateUUIDv7(),
        orderNumber: orderNumberFromDate(),
        userId,
        status: OrderStatus.PENDING,
        totalAmount,
        currency: currency.toUpperCase().slice(0, 3),
        paymentStatus: PaymentStatus.PENDING,
        cinetpayTransId,
        paymentMethod: "CINETPAY",
        items: {
          create: lineItems.map((line) => ({
            id: generateUUIDv7(),
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
          })),
        },
        payments: {
          create: {
            id: generateUUIDv7(),
            amount: totalAmount,
            currency: currency.toUpperCase().slice(0, 3),
            status: PaymentStatus.PENDING,
            provider: "CINETPAY",
            transactionId: cinetpayTransId,
            metadata: { phone },
          },
        },
      },
      include: { items: true, payments: true },
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
    include: { payments: true },
  });

  if (!order) {
    return null;
  }

  if (order.paymentStatus === PaymentStatus.COMPLETED) {
    return order;
  }

  return prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.COMPLETED,
      payments: {
        updateMany: {
          where: { orderId: order.id },
          data: { status: PaymentStatus.COMPLETED },
        },
      },
    },
  });
}
