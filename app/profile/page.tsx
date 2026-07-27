// app/profile/page.tsx
// Page de profil utilisateur, affichant les informations de l'utilisateur connecté,
// ainsi que la liste de ses commandes passées et la gestion de suppression de compte.
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Profile } from "@/components/auth/profile";
import { OrdersContainer } from "@/components/auth/orders-container";
import { DeleteAccountSection } from "@/components/auth/delete-account-section";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/server";
import { OrderCardData } from "@/types/order";

const ORDERS_PAGE_SIZE = 5;

export const metadata: Metadata = {
    title: "Profile | Boutique COGI",
    description: "Consultez vos identifiants, vos commandes et vos préférences.",
};

export default async function ProfilePage() {
  const session = await getServerSession();

  // Redirection si l'utilisateur n'est pas authentifié (Sécurité serveur)
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Récupération des commandes avec Prisma (Performance & Robustesse)
  let orders: OrderCardData[] = [];
  let totalCount = 0;
  let errorMessage: string | null = null;

  try {
    // On récupère le compte total et les premières commandes en parallèle
    const [fetchedOrders, count] = await Promise.all([
      prisma.order.findMany({
        where: { userId: session.user.id },
        include: { orderItems: true },
        orderBy: { createdAt: "desc" },
        take: ORDERS_PAGE_SIZE,
      }),
      prisma.order.count({
        where: { userId: session.user.id }
      })
    ]);

    orders = fetchedOrders as unknown as OrderCardData[];
    totalCount = count;
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    errorMessage = "Impossible de charger votre historique de commandes pour le moment.";
  }
  
  return (
    <main className="container mx-auto max-w-4xl space-y-12 px-4 py-12">

      {/* The Profile component displays user information. */}
      <Profile />

      {/* Gestionnaire de commandes avec pagination */}
      <OrdersContainer 
        initialOrders={orders} 
        initialErrorMessage={errorMessage}
        totalCount={totalCount}
        pageSize={ORDERS_PAGE_SIZE}
      />

      {/* Zone de danger — Suppression de compte */}
      <section className="rounded-2xl border border-red-200 bg-red-50/30 overflow-hidden shadow-sm">
        <div className="border-b border-red-200 bg-red-50/50 px-6 py-4">
          <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Zone de danger
          </h2>
          <p className="text-sm text-red-600 mt-1">
            Actions irréversibles sur votre compte
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Supprimer votre compte</h3>
              <p className="text-sm text-slate-500 mt-1">
                Supprimez définitivement votre compte et toutes vos données personnelles.
                Un snapshot anonymisé sera conservé dans notre registre interne à des fins légales.
              </p>
            </div>
            <DeleteAccountSection />
          </div>
        </div>
      </section>

      <footer className="pt-6 flex flex-wrap gap-4">
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-8 py-3 font-bold text-white shadow-lg transition-all hover:bg-cyan-700 hover:shadow-cyan-200 active:scale-95"
        >
          Continuer mes achats
        </Link>
      </footer>
    </main>
  );
}
