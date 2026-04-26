import { Order, OrderItem, Product } from "@prisma/client";

export type OrderWithItems = Order & {
  orderItems: (OrderItem & {
    product: Product;
  })[];
};