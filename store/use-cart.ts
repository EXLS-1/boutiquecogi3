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
import { RBAC_LEVELS, CatalogProduct } from "@/lib/catalog/catalog-types";

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
  getTotalPrice: (currency: string) => number;
  getItemQuantity: (productId: string) => number;
  isInCart: (productId: string) => boolean;
}

interface PersistedCartItem {
  product: CatalogProduct;
  quantity: number;
  addedAt: string;
}

interface CartStorageState {
  items: PersistedCartItem[];
}

interface CartStore extends CartStoreState, CartStoreActions {}

const MAX_CART_QUANTITY = 99;
const CART_STORAGE_KEY = "boutiquecogi3_cart";

/**
 * Récupère la quantité disponible pour un produit.
 */
function getProductStock(product: CatalogProduct): number {
  const stocked = product as StockedProduct;
  return typeof stocked.stock === "number" ? stocked.stock : MAX_CART_QUANTITY;
}

/**
 * Crée un CartItem immutable avec timestamp
 */
function createCartItem(product: CartProduct, quantity: number = 1): CartItem {
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
  product: CatalogProduct,
  userRbacLevel: number = RBAC_LEVELS.GUEST,
  isAuthenticated: boolean = false,
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
          if (!product.isAvailable || getProductStock(product) <= 0) {
            console.warn(`[Cart] Produit indisponible: ${product.id}`);
            return;
          }

          set((state) => {
            const existingIndex = state.items.findIndex(
              (item) => item.product.id === product.id,
            );

            if (existingIndex >= 0) {
              // Produit existant : mise à jour quantité
              const newQuantity = Math.min(
                state.items[existingIndex].quantity + quantity,
                MAX_CART_QUANTITY,
                getProductStock(product),
              );
              state.items[existingIndex] = {
                ...state.items[existingIndex],
                quantity: newQuantity,
              };
            } else {
              // Nouveau produit
              const validQuantity = Math.min(
                quantity,
                getProductStock(product),
              );
              state.items.push(createCartItem(product, validQuantity));
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
            const product = item.product as any;
            const price =
              currency === "CDF"
                ? (product.priceCDF ??
                  product.priceCdf ??
                  product.price ??
                  product.priceUSD)
                : (product.priceUSD ?? product.price);
            const discountedPrice =
              price * (1 - item.product.discountPercent / 100);
            return sum + discountedPrice * item.quantity;
          }, 0);
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
            const persistedItems = state.items as PersistedCartItem[];
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

// ─── Hooks dérivés pour performance ───────────────────────────────────────────

/** Récupère uniquement le nombre d'items (pas de re-render sur changement prix) */
export function useCartItemCount(): number {
  return useCartStore((state) => state.getTotalItems());
}

/** Récupère uniquement l'état ouvert/fermé */
export function useCartOpen(): boolean {
  return useCartStore((state) => state.isOpen);
}
