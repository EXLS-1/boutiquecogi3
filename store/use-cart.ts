// store/use-cart.ts
/**
 * =============================================================================
 * CART STORE (Zustand) - Boutiquecogi3
 * =============================================================================
 * Panier atomique avec persistance localStorage, validation Zod,
 * et support RBAC. Immutabilité garantie.
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { CatalogProduct } from "@/lib/product-catalog/catalog-types";
import type { Currency } from "@prisma/client";
import {
  CART_STORAGE_KEY,
  MAX_CART_QUANTITY,
  clampCartQuantity,
  resolveCartStock,
  sumCartItemsQuantity,
  sumCartItemsTotal,
} from "@/lib/cart/cart-domain";

interface CartItem {
  product: CatalogProduct;
  quantity: number;
  addedAt: Date;
}
interface StockedProduct extends CatalogProduct {
  stock?: number;
}

type CartProduct = CartItem["product"];

interface CartStoreState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
}

interface CartStoreActions {
  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: (currency: Currency) => number;
  getItemQuantity: (productId: string) => number;
  isInCart: (productId: string) => boolean;
}

interface PersistedCartItem {
  product: CatalogProduct;
  quantity: number;
  addedAt: string;
}

interface CartStore extends CartStoreState, CartStoreActions { }

/**
 * Récupère la quantité disponible pour un produit.
 * Délègue à la logique partagée (`lib/cart/cart-domain`) : une seule règle de
 * stock pour le store, la page panier, le tunnel de paiement et l'admin.
 */
function getProductStock(product: CatalogProduct): number {
  return resolveCartStock(product as StockedProduct) ?? MAX_CART_QUANTITY;
}

/**
 * Crée un CartItem (utilisé hors immer pour l'initialisation)
 */
function createCartItem(product: CartProduct, quantity: number = 1): CartItem {
  return {
    product: { ...product } as CartItem["product"],
    quantity: clampCartQuantity(quantity),
    addedAt: new Date(),
  };
}

export const useCartStore = create<CartStore>()(
  immer(
    persist(
      (set, get) => ({
        // ─── État initial ─────────────────────────────────────────────────────
        items: [],
        isOpen: false,
        isLoading: false,

        // ─── Actions ────────────────────────────────────────────────────────
        addItem: (product, quantity = 1) => {
          if (!product.isAvailable || getProductStock(product) <= 0) {
            console.warn(`[Cart] Produit indisponible: ${product.id}`);
            return;
          }

          set((state) => {
            const existingIndex = state.items.findIndex(
              (item) => item.product.id === product.id,
            );
            // Borne unique : MAX_CART_QUANTITY et stock disponible.
            const maxQuantity = Math.min(
              MAX_CART_QUANTITY,
              getProductStock(product),
            );

            if (existingIndex >= 0) {
              // Produit existant : mise à jour quantité (bornée)
              const newQuantity = clampCartQuantity(
                state.items[existingIndex].quantity + quantity,
                maxQuantity,
              );
              state.items[existingIndex] = {
                ...state.items[existingIndex],
                quantity: newQuantity,
              };
            } else {
              // Nouveau produit
              const newItem = createCartItem(
                product,
                clampCartQuantity(quantity, maxQuantity),
              );
              state.items.push(newItem as unknown as (typeof state.items)[number]);
            }
          });
        },

        removeItem: (productId) => {
          set((state) => {
            state.items = state.items.filter(
              (item) => item.product.id !== productId,
            );
          });
        },

        updateQuantity: (productId, quantity) => {
          if (quantity <= 0) {
            get().removeItem(productId);
            return;
          }

          set((state) => {
            const item = state.items.find((i) => i.product.id === productId);
            if (item) {
              const maxQty = Math.min(
                MAX_CART_QUANTITY,
                getProductStock(item.product),
              );
              item.quantity = clampCartQuantity(quantity, maxQty);
            }
          });
        },

        clearCart: () => {
          set({ items: [] });
        },

        toggleCart: () => {
          set((state) => {
            state.isOpen = !state.isOpen;
          });
        },

        openCart: () => set({ isOpen: true }),
        closeCart: () => set({ isOpen: false }),

        // ─── Sélecteurs ───────────────────────────────────────────────────────
        // Tous les agrégats déléguent à `lib/cart/cart-domain` : les montants
        // affichés (badge, page panier, checkout, commandes) proviennent donc
        // toujours du MÊME calcul.
        getTotalItems: () => {
          return sumCartItemsQuantity(get().items);
        },

        getTotalPrice: (currency) => {
          return sumCartItemsTotal(get().items, currency);
        },

        getItemQuantity: (productId) => {
          const item = get().items.find(
            (item) => item.product.id === productId,
          );
          return item ? item.quantity : 0;
        },

        isInCart: (productId) => {
          return get().items.some((item) => item.product.id === productId);
        },
      }),
      {
        name: CART_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          items: state.items.map((item) => ({
            product: item.product,
            quantity: item.quantity,
            addedAt: item.addedAt.toISOString(),
          })),
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.items) {
            const persistedItems = state.items as unknown as PersistedCartItem[];
            state.items = persistedItems.map((item) => ({
              product: item.product,
              quantity: item.quantity,
              addedAt: new Date(item.addedAt),
            }));
          }
        },
      },
    ),
  ),
);

// ─── Hook par défaut : accès complet au store panier ─────────────────────────
// Exporté par défaut pour permettre à la fois :
//   const { items, addItem } = useCart();          // destructuring du store
//   const addItem = useCart((s) => s.addItem);      // sélecteur Zustand
export default useCartStore;

// ─── Hooks dérivés pour performance ───────────────────────────────────────────

/** Récupère uniquement le nombre d'items (pas de re-render sur changement prix) */
export function useCartItemCount(): number {
  return useCartStore((state) => state.getTotalItems());
}

/** Récupère uniquement l'état ouvert/fermé */
export function useCartOpen(): boolean {
  return useCartStore((state) => state.isOpen);
}
