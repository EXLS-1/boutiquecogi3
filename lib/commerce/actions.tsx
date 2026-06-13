//  lib/commerce/actions.tsx
// Ce fichier contient des Server Actions pour les opérations liées au commerce, comme la récupération du panier, des produits et des catégories.
import { getActiveProducts, getProductCategories } from "@/app/actions/product.actions";

/**
 * Récupère le panier actuel.
 * Pour une robustesse maximale avec Better-Auth, cette fonction devrait 
 * vérifier la session utilisateur ou un cookie de panier persistant.
 */
export async function getCart() {
  // Placeholder professionnel : En attendant l'implémentation complète du modèle Cart dans Prisma,
  // nous retournons null pour éviter de casser le composant CartIcon.
  try {
    // Logique future : const session = await auth.getSession(); ...
    return null;
  } catch (error) {
    console.error("Error fetching cart:", error);
    return null;
  }
}

export async function getProducts() {
  // Utilisation de votre Server Action existante pour la performance et le cache
  const response = await getActiveProducts();
  if (!response.success) return [];
  return response.data.products;
}

export async function getCategories() {
  // Utilisation de votre Server Action existante
  const response = await getProductCategories();
  if (!response.success) return [];
  return response.data;
}