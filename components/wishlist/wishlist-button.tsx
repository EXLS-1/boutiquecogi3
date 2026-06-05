"use client";

import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist, WishlistItem } from "@/store/use-wishlist";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface WishlistButtonProps {
  product: WishlistItem;
  showLabel?: boolean;
  className?: string;
}

export function WishlistButton({ product, showLabel = false, className }: WishlistButtonProps) {
  const [mounted, setMounted] = useState(false);
  const { toggleItem, isInWishlist } = useWishlist();
  
  const active = mounted ? isInWishlist(product.id) : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product);
    
    if (!active) {
      toast.success(`${product.name} ajouté aux favoris`);
    }
  };

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={handleToggle}
      className={cn(
        "group transition-all duration-300 hover:bg-rose-50",
        active ? "text-rose-500" : "text-slate-400 hover:text-rose-400",
        className
      )}
    >
      <Heart className={cn("h-5 w-5 transition-transform duration-300 group-active:scale-125", active && "fill-current")} />
      {showLabel && <span className="ml-2">Favoris</span>}
    </Button>
  );
}