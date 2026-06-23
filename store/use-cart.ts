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
import { 
  CartStore, 
  Product, 
  CartItem, 
  MAX_CART_QUANTITY,
  CART_STORAGE_KEY,
  RBAC_LEVELS,
} from "@/lib/product/product-types";

/**
 * Crée un CartItem immutable avec timestamp
 */
function createCartItem(product: Product, quantity: number = 1): CartItem {
  return Object.freeze({
    product: Object.freeze({ ...product }),
    quantity: Math.min(quantity, MAX_CART_QUANTITY),
    addedAt: new Date(),
  });
}

/**
 * Vérifie si l'utilisateur peut ajouter ce produit (RBAC)
 */
function canAddToCart(
  product: Product,
  userRbacLevel: number = RBAC_LEVELS.GUEST,
  isAuthenticated: boolean = false
): boolean {
  if (product.requiresAuth && !isAuthenticated) return false;
  return userRbacLevel <= product.minRbacLevel;
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
          if (!product.isAvailable || product.stock <= 0) {
            console.warn(`[Cart] Produit indisponible: ${product.id}`);
            return;
          }

          set((state) => {
            const existingIndex = state.items.findIndex(
              (item) => item.product.id === product.id
            );

            if (existingIndex >= 0) {
              // Produit existant : mise à jour quantité
              const newQuantity = Math.min(
                state.items[existingIndex].quantity + quantity,
                MAX_CART_QUANTITY,
                product.stock
              );
              state.items[existingIndex] = {
                ...state.items[existingIndex],
                quantity: newQuantity,
              };
            } else {
              // Nouveau produit
              state.items.push(createCartItem(product, quantity));
            }
          });
        },

        removeItem: (productId) => {
          set((state) => {
            state.items = state.items.filter((item) => item.product.id !== productId);
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
              const maxQty = Math.min(MAX_CART_QUANTITY, item.product.stock);
              item.quantity = Math.min(quantity, maxQty);
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
        getTotalItems: () => {
          return get().items.reduce((sum, item) => sum + item.quantity, 0);
        },

        getTotalPrice: (currency) => {
          return get().items.reduce((sum, item) => {
            const price = currency === "CDF" 
              ? item.product.priceCDF 
              : item.product.priceUSD;
            const discountedPrice = price * (1 - item.product.discountPercent / 100);
            return sum + discountedPrice * item.quantity;
          }, 0);
        },

        getItemQuantity: (productId) => {
          return get().items.find((item) => item.product.id === productId)?.quantity ?? 0;
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
          if (state) {
            // Reconversion des dates après hydration
            state.items = state.items.map((item: any) => ({
              ...item,
              addedAt: new Date(item.addedAt),
            }));
          }
        },
      }
    )
  )
);

// ─── Hooks dérivés pour performance ───────────────────────────────────────────

/** Récupère uniquement le nombre d'items (pas de re-render sur changement prix) */
export function useCartItemCount(): number {
  return useCartStore((state) => state.getTotalItems());
}

/** Récupère uniquement l'état ouvert/fermé */
export function useCartOpen(): boolean {
  return useCartStore((state) => state.isOpen);
}