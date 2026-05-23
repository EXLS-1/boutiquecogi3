// components/auth/order-card.tsx

import { formatDateFR, formatPriceUSD } from "@/lib/currency/format-currency";
import { formatOrderShortId } from "@/lib/orders/format-order-id";

import type { OrderCardData } from "@/types/order";

interface OrderCardProps {
  order: OrderCardData;
}

export function OrderCard({
  order,
}: OrderCardProps) {
  const shippingAddress = [
    order.address,
    order.city,
    order.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-turquoise-400">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
              #{formatOrderShortId(order.id)}
            </span>

            <span className="text-sm text-slate-500">
              {formatDateFR(order.createdAt)}
            </span>
          </div>

          <p className="mt-2 text-sm font-medium text-slate-700">
            {order.orderItems.length} article(s) commandé(s)
          </p>
        </div>

        <div className="flex flex-col justify-between gap-2 sm:items-end">
          <p className="text-xl font-black text-slate-900">
            {formatPriceUSD(order.totalAmount)}
          </p>

          <span
            className={[
              "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider",
              order.isPaid
                ? "border-green-200 bg-green-100 text-green-700"
                : "border-amber-200 bg-amber-100 text-amber-700",
            ].join(" ")}
          >
            {order.isPaid ? "Payée" : "En attente"}
          </span>
        </div>
      </div>

      {shippingAddress.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4 text-xs italic text-slate-500">
          Expédié à : {shippingAddress}
        </div>
      )}
    </article>
  );
}