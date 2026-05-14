import { prisma } from "@/lib/prisma";

export async function getProducts() {
  return prisma.product.findMany({
    where: {
      isArchived: false,
    },

    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      images: true,
      category: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findFirst({
    where: {
      id,
      isArchived: false,
    },

    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      images: true,
      category: true,
    },
  });
}
