// app/checkout/cancel/page.tsx
/**
 * Retour CinetPay — paiement annulé (Server Component).
 *
 * Logique unifiée du panier : contrairement à la page de succès, le panier
 * local est CONSERVÉ (`CheckoutCartPreservedNotice` affiche le rappel via la
 * même logique `buildCartSummary` que la page panier et le checkout).
 * La devise d'affichage est résolue côté serveur depuis le cookie
 * `displayCurrency` pour que le rappel utilise la MÊME devise partout.
 */

import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { CheckoutCartPreservedNotice } from "@/components/cart/checkout-cart-state";
import {
  CART_ROUTES,
  resolveCartCurrency,
} from "@/lib/cart/cart-domain";

export default async function CheckoutCancelPage() {
  const cookieStore = await cookies();
  const currency = resolveCartCurrency(
    cookieStore.get("displayCurrency")?.value,
  );

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-4 text-2xl font-semibold text-amber-700">
        Paiement annulé
      </h1>
      <p className="mb-8 text-zinc-600">
        Votre paiement n&apos;a pas été finalisé. Toutefois, votre panier est toujours
        disponible.
      </p>
      {/* Même logique panier que partout : rappel « panier conservé ». */}
      <CheckoutCartPreservedNotice currency={currency} />
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href={CART_ROUTES.checkout}>Réessayer</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={CART_ROUTES.cart}>Retour au panier</Link>
        </Button>
      </div>
    </div>
  );
}
