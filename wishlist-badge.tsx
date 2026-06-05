"use client";

import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/store/use-wishlist";
import Link from "next/link";
import { cn } from "@/lib/utils/utils";

export function WishlistBadge() {
  const [mounted, setMounted] = useState(false);
  const totalItems = useWishlist((state) => state.totalItems);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="p-2">
      <Heart className="h-6 w-6 text-cyan-700" />
    </div>
  );

  return (
    <Link 
      href="/wishlist" 
      className="relative flex items-center justify-center p-2 rounded-full transition-all duration-200 hover:bg-rose-50 group"
      aria-label="Voir mes favoris"
    >
      <Heart 
        className={cn(
          "h-6 w-6 transition-all duration-300 group-hover:scale-110",
          totalItems > 0 ? "text-rose-500 fill-rose-500" : "text-cyan-700 group-hover:text-rose-500"
        )} 
      />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
          {totalItems}
        </span>
      )}
    </Link>
  );
}