import { prisma } from "@/lib/prisma";

export function findCatalogById(catalogId: string) {
  return prisma.catalog.findUnique({
    where: { id: catalogId },
    select: { id: true, isActive: true },
  });
}

export function findProductForCatalog(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isdeleted: true },
  });
}

export function assignCatalogToProduct(catalogId: string, productId: string) {
  return prisma.catalogProduct.upsert({
    where: { catalogId_productId: { catalogId, productId } },
    create: { catalogId, productId, isActive: true },
    update: { isActive: true },
    select: { catalogId: true, productId: true, isActive: true },
  });
}

export async function removeCatalogFromProduct(
  catalogId: string,
  productId: string,
): Promise<number> {
  const result = await prisma.catalogProduct.deleteMany({
    where: { catalogId, productId },
  });
  return result.count;
}