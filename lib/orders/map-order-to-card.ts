// lib/orders/map-order-to-card.ts
// Helper pour mapper un résultat Prisma `Order` (avec ses `items`)
// vers le type d'affichage `OrderCardData` utilisé dans le profil / historique.
import type { Prisma } from "@prisma/client";
import { OrderCardData, OrderCardItem } from "@/types/order";

// Type exact d'une commande Prisma ayant inclus `items` et `orderAddresses`.
export type OrderWithCardItems = Prisma.OrderGetPayload<{
  include: { items: true; orderAddresses: true };
}>;

function mapAddress(order: OrderWithCardItems) {
  const addr = order.orderAddresses?.[0];
  const street = addr?.street;
  const commune = addr?.commune;
  const city = addr?.city;
  const country = addr?.country;
  const phone = addr?.phone;
  return {
    address: street ? `${street}${commune ? `, ${commune}` : ""}` : null,
    city,
    country,
    phone,
  };
}

/**
 * Convertit un item Prisma `OrderItem` vers `OrderCardItem`.
 */
function mapOrderItem(
  item: OrderWithCardItems["items"][number],
): OrderCardItem {
  return {
    id: item.id,
    name: item.productName,
    imageUrl: item.productImage ?? "",
    price: item.unitPrice,
    quantity: item.quantity,
  };
}

/**
 * Mappe une commande Prisma (avec `items` inclus) vers `OrderCardData`.
 */
export function mapOrderToCard(order: OrderWithCardItems): OrderCardData {
  const { address, city, country, phone } = mapAddress(order);
  return {
    id: order.id,
    createdAt: order.createdAt,
    totalAmount: order.grandTotal,
    isPaid: order.status === "CONFIRMED" || order.status === "DELIVERED",
    address,
    city,
    country,
    orderItems: order.items.map(mapOrderItem),
    status: order.status,
    userId: order.userId ?? "",
    email: "",
    phone,
    userName: "",
    shippingPrice: 0,
    paymentMethod: "",
    paymentStatus: "",
    deliveryStatus: order.status,
    totalPrice: order.totalAmount,
    taxPrice: 0,
    shippingAddress: address,
    shippingCity: city,
    shippingCountry: country,
    shippingPhoneNumber: phone,
  };
}

/**
 * Mappe un tableau de commandes Prisma vers un tableau `OrderCardData`.
 */
export function mapOrdersToCards(
  orders: OrderWithCardItems[],
): OrderCardData[] {
  return orders.map(mapOrderToCard);
}

