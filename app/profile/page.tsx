// app/profile/page.tsx
// Page de profil utilisateur, affichant les informations de l'utilisateur connecté,
// ainsi que la liste de ses commandes passées.
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Profile } from "@/components/auth/profile";
import { OrdersContainer } from "@/components/auth/orders-container";
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

      <footer className="pt-6">
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