// app/actions/chackout.actions.ts

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { initCinetPayPayment } from "@/lib/cinetpay/client";
import { createOrderFromCart } from "@/lib/orders/services.order";

export async function processCinetPayCheckout(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/checkout");
  }

  const rawItems = formData.get("items");
  const currency = String(formData.get("currency") || "USD");
  const phone = String(formData.get("phone") || "");

  if (!phone) {
    throw new Error("Le numéro Mobile Money est requis");
  }

  let items: { id: string; name: string; price: number; quantity: number }[] = [];
  try {
    items = JSON.parse(String(rawItems || "[]"));
  } catch {
    throw new Error("Panier invalide");
  }

  if (!items.length) {
    throw new Error("Votre panier est vide");
  }

  const transactionId = `COGI-${Date.now()}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const amount = items.reduce(
    (acc, item) => acc + Number(item.price) * Number(item.quantity),
    0
  );

  if (amount <= 0) {
    throw new Error("Montant invalide");
  }

  await createOrderFromCart({
    userId: session.user.id,
    items,
    currency,
    phone,
    cinetpayTransId: transactionId,
  });

  const payment = await initCinetPayPayment({
    transaction_id: transactionId,
    amount: Math.round(amount),
    currency,
    description: `Commande Boutique COGI — ${session.user.email ?? session.user.name}`,
    customer_email: session.user.email ?? undefined,
    customer_phone_number: phone,
    notify_url: `${baseUrl}/api/webhook/cinetpay`,
    return_url: `${baseUrl}/checkout/success?transaction_id=${transactionId}`,
    channels: "ALL",
  });

  if (payment.code === "201" && payment.data?.payment_url) {
    redirect(payment.data.payment_url);
  }

  throw new Error(payment.message || "Impossible d'initialiser le paiement CinetPay");
}
