// lib/products.ts
import rawData from "@/data/product-data.json";
import { Product } from "@/types/products";
import { cache } from "react";

// Taux de change fixe (à mettre dans un .env idéalement)
const EXCHANGE_RATE_CDF = 2400; 

export const getAllProducts = cache(
  async (): Promise<Product[]> => {
    return Object.values(rawData.products)
      .flat()
      .map((p: any) => {
        // 1. Extraction et conversion du prix de base (USD)
        const basePrice = Number(p.price || 0);
        
        // 2. Calcul automatique du prix en CDF pour la robustesse
        const priceUSD = basePrice;
        const priceCDF = basePrice * EXCHANGE_RATE_CDF;

        // 3. Normalisation du chemin d'image
        // On s'assure que l'image pointe vers le dossier /media/
        let cleanPath = p.image || "";
        if (!cleanPath.startsWith("/media/")) {
            // Si le chemin est "/pict01.webp", on le transforme en "/media/pict01.webp"
            cleanPath = `/media${cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath}`;
        }

        return {
          ...p,
          id: String(p.id),
          name: p.name || "Produit sans nom",
          priceUSD: priceUSD,
          priceCDF: priceCDF,
          image: cleanPath,
          // Fallback pour les champs manquants
          stock: p.stock ?? 10, 
          description: p.description || "Aucune description disponible",
          category: p.category || "femme"
        };
      });
  }
);