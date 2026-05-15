// app/checkout/page.tsx
import { auth } from "@/lib/auth"; // Ton instance BetterAuth
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import CheckoutClient from "./_components/checkout-client";

export default async function CheckoutPage() {
  // 1. Validation stricte côté serveur avec BetterAuth
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/checkout");
  }

  // 2. Passage propre des données au client
  return <CheckoutClient user={session.user} />;
}