import { buildFallbackCatalog } from "./seeds/catalog.seed";
import { CatalogItem } from "./seeds/catalog.seed";
import { DEFAULT_STOCK } from "./constants/stock.constants";

// 1. Export de la constante de stock pour être utilisé partout
export { DEFAULT_STOCK };

// 2. Le fallback buildé une fois au démarrage (singleton)
const FALLBACK_CATALOG = buildFallbackCatalog();

// 3. La fonction que vos services (ProductService, CartService) appellent
//    quand Prisma/Supabase échoue (catch error).
export function getFallbackCatalog(): Map<string, CatalogItem> {
  return FALLBACK_CATALOG;
}

// 4. Helper pour récupérer un produit spécifique en fallback
export function getFallbackProduct(productId: string): CatalogItem | undefined {
  return FALLBACK_CATALOG.get(productId);
}

// 5. Helper pour récupérer le stock par défaut (pratique pour les tests)
export function getDefaultStock(): number {
  return DEFAULT_STOCK;
}
