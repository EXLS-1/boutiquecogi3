// app/dashboard/admin/page.tsx
// This is the main admin dashboard page.
// cette page est
 
import { Suspense } from "react";
import { getCategories } from "@/lib/actions/category.actions";
import { getProducts } from "@/lib/actions/product.actions";
import { getRecentOrders } from "@/lib/actions/order.actions";

export default async function AdminDashboardPage() {
  const productsResult = await getProducts();
  const products = productsResult.success ? productsResult.data : [];
  const categoriesResult = await getCategories();
  const categories = categoriesResult.success ? categoriesResult.data : [];
  const result = await getRecentOrders(5);
  const orders = result.success ? result.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        Tableau de bord
      </h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Commandes récentes</p>
          <p className="mt-2 text-3xl font-bold text-cyan-900">{orders.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Produits</p>
          <p className="mt-2 text-3xl font-bold text-cyan-900">{products.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Catégories</p>
          <p className="mt-2 text-3xl font-bold text-cyan-900">{categories.length}</p>
        </div>
      </div>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-medium">Dernières commandes</h2>
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    {order.user?.email ?? "Invité"}
                  </td>
                  <td className="px-4 py-3">
                    {(order.totalAmount / 100).toFixed(2)} {order.currency}
                  </td>
                  <td className="px-4 py-3">{order.status}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Aucune commande pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
