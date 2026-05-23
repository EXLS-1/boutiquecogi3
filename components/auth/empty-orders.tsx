// components/auth/empty-orders.tsx

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
        Découvrir nos produits
      </Link>
    </div>
  );
}