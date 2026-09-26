// components/auth/orders-container.tsx
"use client";

import { useState, useTransition } from "react";
import { OrderCardData } from "@/types/order";
import { OrdersList } from "./order-list";
import { Button } from "@/components/ui/button";
import { getPaginatedOrders } from "@/lib/actions/order.actions";
import { Loader2, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

interface OrdersContainerProps {
  initialOrders: OrderCardData[];
  initialErrorMessage: string | null;
  totalCount: number;
  pageSize: number;
}

export function OrdersContainer({
  initialOrders,
  initialErrorMessage,
  totalCount,
  pageSize,
}: OrdersContainerProps) {
  const [orders, setOrders] = useState<OrderCardData[]>(initialOrders);
  const [isPending, startTransition] = useTransition();

  const hasMore = orders.length < totalCount;

  const handleLoadMore = () => {
    startTransition(async () => {
      try {
        const res = await getPaginatedOrders(orders.length, pageSize);
        if (res.success && res.data) {
          setOrders((prev) => [...prev, ...res.data]);
        } else if (!res.success) {
          toast.error(res.error || "Impossible de charger plus de commandes");
        }
      } catch {
        toast.error("Impossible de charger plus de commandes");
      }
    });
  };

  return (
    <div className="space-y-6">
      <OrdersList orders={orders} errorMessage={initialErrorMessage} />

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            disabled={isPending}
            className="border-slate-200 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 min-w-50 transition-all"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            {isPending ? "Chargement..." : "Voir plus de commandes"}
          </Button>
        </div>
      )}

      {!hasMore && orders.length > pageSize && (
        <p className="text-center text-sm text-slate-400 italic">
          Toutes les commandes ont été chargées.
        </p>
      )}
    </div>
  );
}
