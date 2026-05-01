// app/profile/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Session } from "next-auth";

import { getUserOrders } from "@/app/actions/order.actions";
import { formatDateFR } from "@/lib/format";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/profile");
  }

  const userId = session.user?.id;
  const orders = userId ? await getUserOrders(userId) : [];

  const formatPriceUSD = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price / 100); // On divise par 100 car stocké en cents pour Stripe
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-gray-600">
            Bienvenue,{" "}
            <span className="font-semibold">{session.user.name}</span>
          </p>
        </header>

        {/* Account Info */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Informations du compte
          </h2>
          <p>Email : {session.user.email}</p>
          <p className="mt-2">Nom : {session.user.name}</p>
        </section>

        {/* Orders */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Mes commandes</h2>

          {orders.length === 0 ? (
            <p className="text-gray-600">
              Vous n'avez pas encore passé de commande.{" "}
              <Link href="/products" className="underline">
                Commencer à acheter
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <header className="flex justify-between mb-2">
                    <div>
                      <p className="font-semibold">
                        Commande #{order.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDateFR(order.createdAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {formatPriceUSD(order.totalAmount)}
                      </p>
                      <span
                        className={`text-sm px-3 py-1 rounded ${
                          order.isPaid
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {order.isPaid ? "Payée" : "En attente"}
                      </span>
                    </div>
                  </header>

                  <p className="text-sm text-gray-600">
                    {order.orderItems.length} article(s)
                  </p>

                  {(order.address || order.city || order.postalCode || order.country) && (
                    <p className="text-sm mt-1 text-gray-700">
                      Adresse de livraison :{" "}
                      {[order.address, order.city, order.postalCode, order.country]
                        .filter(Boolean)
                        .join(", ")
                      }
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <Link
          href="/products"
          className="inline-block bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800"
        >
          Merci de bien vouloir Continuer vos achats
        </Link>
      </div>
    </main>
  );
}