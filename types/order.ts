// types/order.ts
export interface OrderCardItem {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
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
  status: string;
  userId: string;
  email: string;
  phone?: string | null;
  userName: string;
  postalCode?: string | null;
  shippingPrice: number;
  paymentMethod: string; // "Cash on Delivery" or "Stripe"
  paymentStatus: string; // "Pending", "Paid", "Failed"
  deliveryStatus: string; // "Pending", "Shipped", "Delivered", "Cancelled"
  deliveredAt?: Date | null;
  paidAt?: Date | null;
  totalPrice: number;
  taxPrice: number;
  stripePaymentIntentId?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingCountry?: string | null;
  shippingPostalCode?: string | null;
  shippingPhoneNumber?: string | null;
  shippingEmail?: string | null;
  orderNotes?: string | null;
  couponCode?: string | null;
  discountAmount?: number | null;
}
