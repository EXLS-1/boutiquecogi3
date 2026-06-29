// app/checkout/success/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ transaction_id?: string }>;
}) {
  const params = await searchParams;
  const transactionId = params.transaction_id;

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
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
          <Link href="/products">Continuer mes achats</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/orders">Mes commandes</Link>
        </Button>
      </div>
    </div>
  );
}
