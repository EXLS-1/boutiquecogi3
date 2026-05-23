import { Metadata } from "next";
import Link from "next/link";
import type { OrderCardData } from "@/types/order";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserOrders } from "@/app/actions/order.actions";
import { AccountSection } from "@/components/auth/account-section";
import { OrdersList } from "@/components/auth/order-list";
import { ProfileHeader } from "@/components/auth/profile-header";
import { UserProfile } from "@/components/auth/user-profile";

export const metadata: Metadata = {
    title: "Profile | Boutique COGI",
    description: "Consultez vos identifiants, vos commandes et vos préférences.",
};

export default async function Profile() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const { user } = session;

  let orders: OrderCardData[] = [];

  let errorMessage: string | null = null;

  try {
    const response = await getUserOrders(user.id);

    if (response.success && response.data) {
      orders = response.data;
    } else {
      errorMessage =
        response.error ||
        "Impossible de charger vos commandes.";
    }
  } catch (error) {
      "[PROFILE_ORDERS_FETCH_ERROR]",
      error,
    console.error("[PROFILE_ORDERS_FETCH_ERROR]", error);
    errorMessage =
      "Une erreur technique est survenue lors du chargement des commandes.";
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      <ProfileHeader
        userName={user.name}
      />

      <UserProfile user={user} />

      <AccountSection
        name={user.name}
        email={user.email}
      />

      <OrdersList
        orders={orders}
        errorMessage={errorMessage}
      />

      <footer className="pt-6">
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-8 py-3 font-bold text-white shadow-lg transition-all hover:bg-turquoise-700 hover:shadow-turquoise-200"
        >
          Continuer mes achats
        </Link>
      </footer>
    </main>
  );
}