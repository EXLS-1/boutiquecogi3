import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WishlistStore {
  items: any[];
  toggleItem: (data: any) => void;
}

const useWishlist = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggleItem: (data: any) => {
        const currentItems = get().items;
        const exists = currentItems.find((item) => item.id === data.id);

        if (exists) {
          set({ items: currentItems.filter((item) => item.id !== data.id) });
        } else {
          set({ items: [...currentItems, data] });
        }
      },
    }),
    { name: "wishlist-storage", storage: createJSONStorage(() => localStorage) }
  )
);

export default useWishlist;