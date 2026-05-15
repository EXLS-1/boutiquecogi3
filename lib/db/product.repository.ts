import { prisma } from "@/lib/prisma";

export async function getProducts() {
  return prisma.product.findMany({
    where: { isArchived: false },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductById(id: string) {
  const byVariant = await prisma.productVariant.findFirst({
    where: { OR: [{ sku: id }, { id }] },
    include: {
      product: {
        include: {
          category: true,
          variants: true,
        },
      },
    },
  });

  if (byVariant?.product && !byVariant.product.isArchived) {
    return byVariant.product;
  }

  return prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      isArchived: false,
    },
    include: {
      category: true,
      variants: true,
    },
  });
}
