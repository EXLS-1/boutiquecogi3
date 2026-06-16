// app/actions/admin/order.admin.actions.ts

"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/rbac";

export async function getAllOrdersAdmin() {
  await requirePermission(PERMISSIONS.ORDERS_READ);

  return prisma.order.findMany({
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
      items: {
        include: {
          variant: {
            include: { product: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
