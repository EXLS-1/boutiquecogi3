// app/checkout/cancel/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-4 text-2xl font-semibold text-amber-700">
        Paiement annulé
      </h1>
      <p className="mb-8 text-zinc-600">
        Votre paiement n&apos;a pas été finalisé. Votre panier est toujours
        disponible.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/checkout">Réessayer</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/cart">Retour au panier</Link>
        </Button>
      </div>
    </div>
  );
}
