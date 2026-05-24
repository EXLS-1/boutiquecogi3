// components/auth/empty-orders.tsx
// This component is displayed when the user has no orders in their history.
// It provides a message indicating that the order history is empty
// and includes a link to discover products.
import Link from "next/link";

export function EmptyOrders() {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
      <p className="mb-6 text-slate-600">
        Votre historique est vide.
      </p>

      <Link
        href="/products"
        className="inline-flex items-center rounded-lg bg-rose-500 px-4 py-2 font-medium text-white transition-colors hover:bg-rose-600"
      >
        Découvrir tous nos produits.
      </Link>
    </div>
  );
}