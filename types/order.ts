import { Order, OrderItem, Product } from "@prisma/client";

export type OrderWithItems = Order & {
  items: (OrderItem & {
    product: Product;
  })[];
};