// app/checkout/page.tsx
/**
 * Page d'entrée du tunnel de paiement (Server Component).
 *
 * Logique unifiée du panier :
 *  - la session est validée côté serveur (Better-Auth) ;
 *  - le calcul du panier (prix, stock, total, devise) est délégué au client
 *    via la source unique `lib/cart/cart-domain` (`useCartCurrency`,
 *    `buildCartSummary`) utilisée à l'identique par la page panier ;
 *  - la redirection de connexion préserve la destination (`callbackUrl`).
 */
import { auth } from "@/lib/auth"; // Ton instance BetterAuth
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { buildSignInRedirect, CART_ROUTES } from "@/lib/cart/cart-domain";
import CheckoutClient from "./_components/checkout-client";

export default async function CheckoutPage() {
  // 1. Validation stricte côté serveur avec BetterAuth
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect(buildSignInRedirect(CART_ROUTES.checkout));
  }

  // 2. Passage propre des données au client
  return <CheckoutClient user={session.user} />;
}