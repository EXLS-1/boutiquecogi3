"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useWishlist } from "@/store/use-wishlist";
import { syncWishlistAction } from "@/app/actions/wishlist.actions";

export function WishlistSyncManager() {
  const { data: session } = authClient.useSession();
  const { items } = useWishlist();

  useEffect(() => {
    if (session?.user && items.length > 0) {
      const handleSync = async () => {
        const result = await syncWishlistAction(items);
        if (result.success) {
          console.log("Wishlist synchronisée");
        }
      };
      handleSync();
    }
  }, [session, items.length]);

  return null;
}