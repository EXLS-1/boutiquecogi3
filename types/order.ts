import type { Order, OrderItem, Product, ProductVariant, User } from "@prisma/client";

export type OrderWithItems = Order & {
  items: (OrderItem & {
    variant: ProductVariant & {
      product: Product;
    };
  })[];
  user?: Pick<User, "id" | "name" | "email"> | null;
};
