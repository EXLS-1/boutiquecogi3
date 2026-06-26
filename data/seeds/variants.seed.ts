import { ProductVariant } from "../types/product.types";
import { DEFAULT_CURRENCY } from "../constants/currency.constants";
import { DEFAULT_STOCK } from "../constants/stock.constants";

// On crée des déclinaisons concrètes
export const variantsSeed: (Omit<ProductVariant, "stock"> & {
  stock?: number;
})[] = [
  // Pour la robe florale
  {
    id: "vf1-42-jaune",
    productId: "robe_florale",
    size: "42",
    color: "Jaune-Vert vif",
    sku: "RF-42-JV",
    price: { amount: 95, currencyCode: DEFAULT_CURRENCY, isTaxIncluded: true },
    images: [
      { url: "/pict01.webp", alt: "Robe jaune", isPrimary: true, order: 0 },
    ],
    stock: DEFAULT_STOCK, // 10
  },
  {
    id: "vf1-48-jaune",
    productId: "robe_florale",
    size: "48",
    color: "Jaune-Vert vif",
    sku: "RF-48-JV",
    price: { amount: 95, currencyCode: DEFAULT_CURRENCY, isTaxIncluded: true },
    images: [
      { url: "/pict01.webp", alt: "Robe jaune", isPrimary: true, order: 0 },
    ],
    stock: 5, // stock spécifique
  },
  // Pour le costume noir
  {
    id: "vh1-40-noir",
    productId: "costume_noir",
    size: "40",
    color: "Noir",
    sku: "CN-40-N",
    price: { amount: 120, currencyCode: DEFAULT_CURRENCY, isTaxIncluded: true },
    images: [
      { url: "/pict02.webp", alt: "Costume noir", isPrimary: true, order: 0 },
    ],
    stock: DEFAULT_STOCK,
  },
  // Ajoutez vos autres variantes ici (chaussures, sacs, etc.) en évitant les doublons.
];
