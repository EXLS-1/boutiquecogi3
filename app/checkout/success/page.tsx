// app/checkout/success/page.tsx
/**
 * Retour CinetPay — paiement en cours de validation (Server Component).
 *
 * Logique unifiée du panier : le panier local est vidé côté client
 * (`CheckoutSuccessCartReset`) car la commande est persistée AVANT la
 * redirection CinetPay (`createOrderFromCart`) — sans cela, le retour
 * produirait un doublon de commande. Les routes proviennent de la source
 * unique `lib/cart/cart-domain` (`CART_ROUTES`).
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckoutSuccessCartReset } from "@/components/cart/checkout-cart-state";
import { CART_ROUTES, sanitizeCartTransactionRef } from "@/lib/cart/cart-domain";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ transaction_id?: string }>;
}) {
  const params = await searchParams;
  const transactionId = sanitizeCartTransactionRef(params.transaction_id);

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
      {/* Vide le panier local — la commande est déjà persistée côté serveur. */}
      <CheckoutSuccessCartReset />
      <h1 className="mb-4 text-2xl font-semibold text-emerald-700">
        Paiement en cours de validation
      </h1>
      <p className="mb-6 text-zinc-600">
        Merci pour votre commande. Vous recevrez une confirmation dès que le
        paiement Mobile Money sera validé.
      </p>
      {transactionId && (
        <p className="mb-8 text-sm text-zinc-500">
          Référence : <span className="font-mono">{transactionId}</span>
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href={CART_ROUTES.products}>Continuer mes achats</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={CART_ROUTES.accountOrders}>Mes commandes</Link>
        </Button>
      </div>
    </div>
  );
}
