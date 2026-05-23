// types/order.ts

export interface OrderCardItem {
  id: string;
}

export interface OrderCardData {
  id: string;

  createdAt: Date | string;

  totalAmount: number;

  isPaid: boolean;

  address?: string | null;
  city?: string | null;
  country?: string | null;

  orderItems: OrderCardItem[];
}
