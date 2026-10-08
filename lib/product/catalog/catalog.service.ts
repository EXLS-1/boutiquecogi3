import { ProductServiceError } from "@/lib/product/product-errors";
import {
  assignCatalogToProduct as saveCatalogAssignment,
  findCatalogById,
  findProductForCatalog,
  removeCatalogFromProduct as deleteCatalogAssignment,
} from "./catalog.repository";

export async function assertCatalogIsActive(catalogId: string): Promise<void> {
  const catalog = await findCatalogById(catalogId);
  if (!catalog) {
    throw new ProductServiceError("Catalogue introuvable", "NOT_FOUND", 404);
  }
  if (!catalog.isActive) {
    throw new ProductServiceError("Le catalogue est inactif", "CATALOG_INACTIVE", 409);
  }
}

export async function assignCatalogToProduct(
  productId: string,
  catalogId: string,
) {
  const product = await findProductForCatalog(productId);
  if (!product) {
    throw new ProductServiceError("Produit introuvable", "NOT_FOUND", 404);
  }
  if (product.isdeleted) {
    throw new ProductServiceError("Impossible d'assigner un produit supprimé", "PRODUCT_DELETED", 409);
  }

  await assertCatalogIsActive(catalogId);
  return saveCatalogAssignment(catalogId, productId);
}

export async function removeCatalogFromProduct(
  productId: string,
  catalogId: string,
): Promise<void> {
  const product = await findProductForCatalog(productId);
  if (!product) {
    throw new ProductServiceError("Produit introuvable", "NOT_FOUND", 404);
  }

  const removedCount = await deleteCatalogAssignment(catalogId, productId);
  if (removedCount === 0) {
    throw new ProductServiceError(
      "Le catalogue n'est pas assigné à ce produit",
      "CATALOG_NOT_ASSIGNED",
      404,
    );
  }
}