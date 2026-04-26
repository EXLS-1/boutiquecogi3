import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAllOrdersAdmin } from "@/app/actions/admin/order.admin.actions";
import { requireAdmin } from "@/lib/rbac";

export default async function AdminOrdersPage() {
  const session = await getServerSession();
  requireAdmin(session);

  const orders = await getAllOrdersAdmin();

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Commandes</h1>

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="border p-4 rounded">
            <p>Commande #{order.id}</p>
            <p>Client : {order.user?.email || "Anonyme"}</p>
            <p>Total : {order.totalAmount} usd</p>
            <p>Status : {order.isPaid ? "Payée" : "En attente"}</p>
          </div>
        ))}
      </div>
    </main>
  );
}