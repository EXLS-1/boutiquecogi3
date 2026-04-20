import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (data: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, action: 'increase' | 'decrease') => void; // Nouvelle fonction
  removeAll: () => void;
}

const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (data: CartItem) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === data.id);

        if (existingItem) {
          // Incrémenter la quantité si le produit existe déjà
          set({
            items: currentItems.map((item) =>
              item.id === data.id
                ? { ...item, quantity: item.quantity + data.quantity }
                : item
            ),
          });
          return;
        }

        set({ items: [...get().items, data] });
      },
      removeItem: (id: string) => {
        set({ items: [...get().items.filter((item) => item.id !== id)] });
      },
      updateQuantity: (id: string, action: 'increase' | 'decrease') => {
        const currentItems = get().items;
        const updatedItems = currentItems.map((item) => {
          if (item.id === id) {
            const newQuantity = action === 'increase' ? item.quantity + 1 : item.quantity - 1;
            return { ...item, quantity: Math.max(1, newQuantity) }; // Empêche de descendre sous 1
          }
          return item;
        });
        set({ items: updatedItems });
      },
      removeAll: () => set({ items: [] }),
    }),
    {
      name: "cart-storage", // Nom de la clé dans le localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useCart;
