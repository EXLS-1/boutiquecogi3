// app/checkout/checkout-action.tsx
"use server";

import { auth } from "better-auth"; // exemple, à adapter
import { redirect } from "next/navigation";

export async function processCinetPayCheckout(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const amount = Number(formData.get("amount"));
  const currency = (formData.get("currency") as string) || "USD";

  const payload = {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: `B-COGI-${Date.now()}`,
    amount,
    currency,
    description: `Commande Boutique COGI - ${session.user.email}`,
    customer_email: session.user.email,
    customer_phone_number: formData.get("phone") as string,
    notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/cinetpay`,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
    channels: "ALL",
  };

  const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.code === "201") {
    redirect(data.data.payment_url);
  } else {
    throw new Error("Paiement échoué");
  }
}
