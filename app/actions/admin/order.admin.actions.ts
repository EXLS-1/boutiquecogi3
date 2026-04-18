"use server";

import prisma from "@/lib/prisma";

export async function getAllOrdersAdmin() {
  return prisma.order.findMany({
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}