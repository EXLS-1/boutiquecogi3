// components/cart/cart-icon.tsx
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { CART_LABELS, CART_ROUTES } from "@/lib/cart/cart-domain";
import { cn } from "@/lib/utils/cn";
import { CartBadge } from "./cart-badge";

type CartIconProps = {
  className?: string;
};

/**
 * CartIcon reste un Server Component pour garantir que le lien
 * vers le panier est immédiatement disponible et crawlable.
 * Route et libellé proviennent de `lib/cart/cart-domain` (source unique).
 */
export default function CartIcon({ className }: CartIconProps) {
  return (
    <Link
      href={CART_ROUTES.cart}
      aria-label={CART_LABELS.viewCart}
      title={CART_LABELS.viewCart}
      className={cn("group/cart relative flex items-center transition-colors", className)}
    >
      <ShoppingCart className="h-6 w-6 text-cyan-400 group-hover/cart:text-rose-500" aria-hidden="true" />
      <CartBadge />
    </Link>
  );
}