// app/orders/page.tsx
// Page d'administration des commandes protégée par RBAC
// Si un utilisateur non-staff consulte cette page, il est automatiquement redirigé vers sa propre page de commandes.

import { redirect } from "next/navigation";
import { resolveAuthContext } from "@/lib/auth/server";
import { getAllOrdersAdmin } from "@/lib/actions/actions/admin/order.admin.actions";
import {
  CART_ROUTES,
  formatCartItemCount,
  formatOrderAmountMinor,
  formatOrderDate,
  getOrderItemsCount,
  getOrderPaymentLabel,
  getOrderStatusLabel,
  matchesOrderQuery,
  resolveOrderCurrency,
  resolveOrderPaymentStatus,
} from "@/lib/cart/cart-domain";

interface AdminOrderRow {
  id: string;
  orderNumber: string;
  user: { email: string | null; name: string | null } | null;
  items?: readonly unknown[] | null;
  totalAmount: unknown;
  currency: unknown;
  status: unknown;
  paymentStatus?: unknown;
  payment?: { status?: unknown } | null;
  createdAt: unknown;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authContext = await resolveAuthContext();

  if (!authContext?.user) {
    redirect("/auth/sign-in?callbackUrl=/orders");
  }

  // Seul le personnel autorisé (Level <= 3 ou permissions RBAC globales) peut voir cette vue
  const isStaff =
    authContext.permissions.has("orders:read") ||
    authContext.permissions.has("order:read:any") ||
    authContext.user.level <= 3;

  if (!isStaff) {
    redirect(CART_ROUTES.accountOrders);
  }

  const params = await searchParams;
  const orders: readonly AdminOrderRow[] = await getAllOrdersAdmin();
  const rawQuery = params?.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
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
                <td className="px-4 py-3">
                  {formatCartItemCount(getOrderItemsCount(order))}
                </td>
                <td className="px-4 py-3">
                  {formatOrderAmountMinor(
                    order.totalAmount,
                    resolveOrderCurrency(order.currency),
                  )}
                </td>
                <td className="px-4 py-3">
                  {getOrderPaymentLabel(resolveOrderPaymentStatus(order))}
                </td>
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
