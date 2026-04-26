 "use server";

import { prisma } from "@/lib/prisma";
import { OrderWithItems } from "@/types/order";

export async function getUserOrders(
  userId: string
): Promise<OrderWithItems[]> {
  return prisma.order.findMany({
    where: { userId },
    include: {
      orderItems: {
        include: { product: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
