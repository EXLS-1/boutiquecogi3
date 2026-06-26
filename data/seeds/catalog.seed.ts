import { BaseProduct } from "../types/product.types";
import { Category } from "../types/category.types";
import { ProductVariant } from "../types/product.types";
import { categoriesSeed } from "./categories.seed";
import { baseProductsSeed } from "./base-products.seed";
import { variantsSeed } from "./variants.seed";

export interface CatalogItem {
  baseProduct: BaseProduct;
  category: Category;
  variants: ProductVariant[];
}

export function buildFallbackCatalog(): Map<string, CatalogItem> {
  const catalogMap = new Map<string, CatalogItem>();

  baseProductsSeed.forEach((base) => {
    const category = categoriesSeed[base.categoryId];
    if (!category) return;

    const variants = variantsSeed.filter((v) => v.productId === base.id);

    // On transforme les variants pour ajouter le stock (qui est déjà dans la seed)
    // mais ici on s'assure que chaque variant a bien un stock défini.
    const enrichedVariants = variants.map((v) => ({
      ...v,
      stock: v.stock ?? 10, // fallback local si oublié
    }));

    catalogMap.set(base.id, {
      baseProduct: base,
      category,
      variants: enrichedVariants,
    });
  });

  return catalogMap;
}
