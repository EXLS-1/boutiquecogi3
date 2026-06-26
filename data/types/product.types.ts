import { CategoryId } from "./category.types";
import { Price, ProductImage } from "./common.types";

// Le Product Parent (ce qui est commun à toutes les déclinaisons)
export interface BaseProduct {
  id: string;
  name: string;
  description: string;
  categoryId: CategoryId;
  brand?: string;
  defaultImage: string; // fallback si variant n'a pas d'image
  isActive: boolean;
}

// La Variant = le SKU physique (celui qui a un stock et un prix définitif)
export interface ProductVariant {
  id: string; // Ex: "f1-42-jaune"
  productId: string; // Référence au BaseProduct (ex: "f1")
  size: string;
  color: string;
  price: Price; // Objet, pas un nombre brut
  images: ProductImage[]; // Images spécifiques à cette variante
  sku: string; // Code barre unique
}
