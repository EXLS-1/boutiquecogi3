import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { getCart } from "@/lib/commerce/actions";
import { Suspense } from "react";

export default async function CartIcon() {
  return (
    <Suspense fallback={<ShoppingCart />}>
      <CartIconContent />
    </Suspense>
  );
}

async function CartIconContent() {
  const cart = await getCart();
  return (
    <Link href="/cart" aria-label="Cart" className="relative">
      <ShoppingCart />
      {cart?.totalQuantity ? (
        <div className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[11px] font-medium text-white">
          {cart.totalQuantity}
        </div>
      ) : null}
    </Link>
  );
}