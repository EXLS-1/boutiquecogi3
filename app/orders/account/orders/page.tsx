// app/account/orders/page.tsx
// Compte client : montants, statuts et libellés proviennent de la logique
// partagée (`lib/cart/cart-domain`) — MÊME formatage que le panier, le
// checkout et l'admin (centimes `Int` Prisma → unités majeures).

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserOrders } from "@/lib/actions/order.actions";
import { Button } from "@/components/ui/button";
import {
  CART_ROUTES,
  buildSignInRedirect,
  formatOrderAmountMinor,
  formatOrderDate,
  getOrderItemsCount,
  getOrderPaymentLabel,
  getOrderStatusLabel,
  resolveOrderCurrency,
} from "@/lib/cart/cart-domain";

export default async function AccountOrdersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect(buildSignInRedirect(CART_ROUTES.accountOrders));
  }

  const result = await getUserOrders(session.user.id);
  const orders = result.success ? result.data : [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Mes commandes</h1>

      {orders.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="mb-4 text-zinc-600">Vous n&apos;avez pas encore de commande.</p>
          <Button asChild>
            <Link href={CART_ROUTES.products}>Découvrir la boutique</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm text-zinc-500">
                    {order.orderNumber} · {formatOrderDate(order.createdAt)}
                  </p>
                  <p className="font-medium">
                    {formatOrderAmountMinor(
                      order.totalAmount,
                      resolveOrderCurrency(order.currency),
                    )}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>{getOrderStatusLabel(order.status)}</p>
                  <p className="text-zinc-500">
                    {getOrderPaymentLabel(
                      (order as { paymentStatus?: unknown }).paymentStatus ??
                        (order as { payment?: { status?: unknown } | null })
                          .payment?.status,
                    )}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                {getOrderItemsCount(order)} article(s)
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
