// types/products.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  priceCDF: number;
  stock: number;
  image: string; // URL principale
  mediaUrls: string[]; // Pour la galerie
  category: string;
}
