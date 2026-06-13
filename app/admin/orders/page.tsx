// app/admin/orders/page.tsx

"use server";

import { format } from "date-fns";
import { getAllOrdersAdmin } from "@/app/actions/admin/order.admin.actions";

export default async function AdminOrdersPage() {
  const orders = await getAllOrdersAdmin();

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
            {orders.map((order) => (
              <tr key={order.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  {order.orderNumber}
                </td>
                <td className="px-4 py-3">{order.user?.email ?? "—"}</td>
                <td className="px-4 py-3">{order.items.length}</td>
                <td className="px-4 py-3">
                  {(order.totalAmount / 100).toFixed(2)} {order.currency}
                </td>
                <td className="px-4 py-3">{order.paymentStatus}</td>
                <td className="px-4 py-3">
                  {format(order.createdAt, "dd/MM/yyyy")}
                </td>
                <td className="px-4 py-3">{order.status}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
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
