// components/auth/profile.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth"; // Ton instance BetterAuth configurée
import { getUserOrders } from "@/app/actions/order.actions";
import { formatDateFR, formatPriceUSD } from "@/lib/format";

export default async function ProfilePage() {
  // 1. Session BetterAuth (Server-side)
  // Utilisation des headers pour valider la session de manière sécurisée
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login?callbackUrl=/profile");
  }

  const { user } = session;

  // 2. Récupération des données avec isolation d'erreur
  let orders = [];
  try {
    // BetterAuth fournit un ID utilisateur stable et typé
    orders = await getUserOrders(user.id);
  } catch (error) {
    console.error("[PROFILE_ERROR]: Failed to fetch orders", error);
    // On ne laisse pas l'application planter, on retourne un état vide ou une erreur contrôlée
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mon Profil</h1>
        <p className="text-slate-500">
          Bienvenue, <span className="font-semibold text-turquoise-600">{user.name}</span>
        </p>
      </header>

      {/* Account Section */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Informations du compte</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">Nom complet</p>
            <p className="text-slate-900 font-semibold">{user.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">Adresse Email</p>
            <p className="text-slate-900 font-semibold">{user.email}</p>
          </div>
        </div>
      </section>

      {/* Orders Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Historique des commandes</h2>
        
        {orders.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-6">Votre historique est vide.</p>
            <Link 
              href="/products" 
              className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors"
            >
              Découvrir nos produits
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      <footer className="pt-6">
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-8 py-3 rounded-md bg-slate-900 text-white font-bold hover:bg-turquoise-700 transition-all shadow-lg hover:shadow-turquoise-200"
        >
          Continuer mes achats
        </Link>
      </footer>
    </main>
  );
}

// 3. Composant Interne Typé
// À terme, remplace 'any' par l'interface générée par ton schéma de base de données
function OrderCard({ order }: { order: any }) {
  return (
    <article className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-turquoise-400 transition-all shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              #{order.id.slice(-8).toUpperCase()}
            </span>
            <span className="text-sm text-slate-500">{formatDateFR(order.createdAt)}</span>
          </div>
          <p className="text-sm font-medium text-slate-700 mt-2">
            {order.orderItems.length} article(s) commandé(s)
          </p>
        </div>

        <div className="flex flex-col sm:items-end justify-between gap-2">
          <p className="text-xl font-black text-slate-900">
            {formatPriceUSD(order.totalAmount)}
          </p>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
            order.isPaid 
              ? "bg-green-100 text-green-700 border border-green-200" 
              : "bg-amber-100 text-amber-700 border border-amber-200"
          }`}>
            {order.isPaid ? "Payée" : "En attente"}
          </span>
        </div>
      </div>

      {order.address && (
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
          Expédié à : {[order.address, order.city, order.country].filter(Boolean).join(", ")}
        </div>
      )}
    </article>
  );
}