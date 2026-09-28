// lib/product/product-events.ts

export type ProductEventType =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_RESTORED"
  | "PRODUCT_STATUS_CHANGED"
  | "PRODUCT_STOCK_ADJUSTED";

export interface ProductEvent<T = unknown> {
  type: ProductEventType;
  productId: string;
  timestamp: Date;
  payload: T;
}

type EventListener = (event: ProductEvent) => Promise<void> | void;
const listeners: EventListener[] = [];

export function registerProductEventListener(listener: EventListener): void {
  listeners.push(listener);
}

export async function emitProductEvent<T>(type: ProductEventType, productId: string, payload: T): Promise<void> {
  const event: ProductEvent<T> = {
    type,
    productId,
    timestamp: new Date(),
    payload,
  };
  await Promise.allSettled(listeners.map((fn) => fn(event)));
}
