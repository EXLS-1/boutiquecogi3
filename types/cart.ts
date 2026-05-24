// types/cart.ts
// Types relatifs au panier d’achat (session utilisateur ou panier persistant).

export type CartItem = {
  variantId: string; // lien vers ProductVariant
  quantity: number;
  addedAt: Date;
};

export type Cart = {
  id: string;
  userId?: string; // si utilisateur connecté
  items: CartItem[];
  totalItems: number;
  subtotal: number; // en centimes
  discounts: number;
  total: number;
};
