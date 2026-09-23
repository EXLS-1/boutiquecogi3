// app/admin/orders/page.tsx
// Liste admin : MÊME formatage monétaire et MÊMES libellés de statuts que le
// panier, le checkout et le compte client (`lib/cart/cart-domain`).
// Les `Int` Prisma (`totalAmount` en centimes) sont convertis via
// `formatOrderAmountMinor` — jamais de `(x / 100).toFixed(2)` local.

import { getAllOrdersAdmin } from "@/lib/actions/actions/admin/order.admin.actions";
import {
  formatOrderAmountMinor,
  formatOrderDate,
  getOrderItemsCount,
  getOrderPaymentLabel,
  getOrderStatusLabel,
  matchesOrderQuery,
  resolveOrderCurrency,
} from "@/lib/cart/cart-domain";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const orders = await getAllOrdersAdmin();
  const query = params?.q?.trim() ?? "";
  const visibleOrders = orders.filter((order) =>
    matchesOrderQuery(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        user: order.user
          ? { email: order.user.email, name: null }
          : null,
      },
      query,
    ),
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Commandes</h1>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3">N° commande</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => (
              <tr key={order.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  {order.orderNumber}
                </td>
                <td className="px-4 py-3">{order.user?.email ?? "—"}</td>
                <td className="px-4 py-3">{getOrderItemsCount(order)}</td>
                <td className="px-4 py-3">
                  {formatOrderAmountMinor(
                    order.totalAmount,
                    resolveOrderCurrency(order.currency),
                  )}
                </td>
                <td className="px-4 py-3">{getOrderPaymentLabel(order.paymentStatus)}</td>
                <td className="px-4 py-3">
                  {formatOrderDate(order.createdAt)}
                </td>
                <td className="px-4 py-3">{getOrderStatusLabel(order.status)}</td>
              </tr>
            ))}
            {visibleOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Aucune commande.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
