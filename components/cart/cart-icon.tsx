// components/cart/cart-icon.tsx
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { CartBadge } from "./cart-badge";

/**
 * CartIcon reste un Server Component pour garantir que le lien 
 * vers le panier est immédiatement disponible et crawlable.
 */
export default function CartIcon() {
  return (
    <Link 
      href="/cart" 
      aria-label="Cart" 
      className="relative flex items-center transition-colors hover:text-rose-400"
    >
      <ShoppingCart className="h-6 w-6 text-cyan-400" />
      <CartBadge />
    </Link>
  );
}