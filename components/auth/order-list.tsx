// components/auth/orders-list.tsx

import { AlertCircle, ShoppingBag } from "lucide-react";

import { EmptyOrders } from "@/components/auth/empty-orders";
import { OrderCard } from "@/components/auth/order-card";

import type { OrderCardData } from "@/types/order";

interface OrdersListProps {
  orders: OrderCardData[];
  errorMessage?: string | null;
}

export function OrdersList({
  orders,
  errorMessage,
}: OrdersListProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-slate-400" />

        <h2 className="text-xl font-bold text-slate-900">
          Historique des commandes
        </h2>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />

          <p className="text-sm font-medium">
            {errorMessage}
          </p>
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
            />
          ))}
        </div>
      )}
    </section>
  );
}