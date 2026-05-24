// types/checkout.ts

export type Address = {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export type CheckoutSession = {
  id: string;
  cartId: string;
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethodId: string;
  paymentMethod: "card" | "paypal" | "cod";
  status: "pending" | "completed" | "failed";
  createdAt: Date;
};

export type ShippingMethod = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export type PaymentMethod = {
  id: string;
  name: string;
  description: string;
};

export type CheckoutData = {
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  totalPrice: number;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
};

export type CheckoutSummary = {
  subtotal: number;
  shippingCost: number;
  total: number;
};

export type CheckoutState = {
  currentStep: number;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  shippingMethod: ShippingMethod | null;
  paymentMethod: PaymentMethod | null;
  cartItems: { productId: string; quantity: number }[];
  checkoutSummary: CheckoutSummary | null;
  loading: boolean;
  error: string | null;
};
