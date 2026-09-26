// lib/actions/chackout.actions.ts

"use server";

import { Currency } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { initCinetPayPayment } from "@/lib/cinetpay/client";
import { createOrderFromCart } from "@/lib/orders/services.order";
import { normalizeMobileMoneyPhone } from "@/app/checkout/_components/checkout-helpers";
import {
  buildSignInRedirect,
  CART_ROUTES,
  resolveCartCurrency,
  roundCartAmount,
} from "@/lib/cart/cart-domain";

export async function processCinetPayCheckout(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    // Source unique : même construction d'URL que le client (`checkout-client`).
    redirect(buildSignInRedirect(CART_ROUTES.checkout));
  }

  const rawItems = formData.get("items");
  // Devise résolue via la source unique (USD par défaut, jamais de valeur libre).
  const rawCurrencyValue = formData.get("currency");
  const currency: Currency = resolveCartCurrency(
    typeof rawCurrencyValue === "string" ? rawCurrencyValue : undefined,
  ) as Currency;
  const rawPhone = formData.get("phone");
  // Normalisation unifiée : même règle RDC que le client (blur + submit).
  const phone = normalizeMobileMoneyPhone(rawPhone);

  if (!phone) {
    throw new Error(
      "Numéro invalide. Format attendu : +243 812 345 678 (M-Pesa, Orange Money, Airtel Money).",
    );
  }

  let items: {
    id: string;
    productId?: string;
    variantId?: string;
    name: string;
    price: number;
    quantity: number;
  }[] = [];
  try {
    const parsed: unknown = JSON.parse(String(rawItems || "[]"));
    if (!Array.isArray(parsed)) throw new Error("Panier invalide");
    items = parsed.map((raw) => {
      if (!raw || typeof raw !== "object") throw new Error("Panier invalide");
      const item = raw as Record<string, unknown>;
      if (
        typeof item.id !== "string" ||
        typeof item.name !== "string" ||
        typeof item.price !== "number" || !Number.isFinite(item.price) || item.price <= 0 ||
        typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1
      ) throw new Error("Panier invalide");
      return {
        id: item.id,
        ...(typeof item.productId === "string" ? { productId: item.productId } : {}),
        ...(typeof item.variantId === "string" ? { variantId: item.variantId } : {}),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      };
    });
  } catch {
    throw new Error("Panier invalide");
  }

  if (!items.length) {
    throw new Error("Votre panier est vide");
  }

  const transactionId = `COGI-${Date.now()}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Même arrondi que le panier et le checkout : la précision suit la devise
  // (CDF → 0 décimale, USD → 2) au lieu d'un simple `Number(...)`.
  const amount = roundCartAmount(
    items.reduce(
      (acc, item) => acc + Number(item.price) * Number(item.quantity),
      0,
    ),
    currency,
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
    amount,
    currency,
    description: `Commande Boutique COGI — ${
      session.user.email ?? session.user.name
    }`,
    customer_email: session.user.email ?? undefined,
    customer_phone_number: phone,
    notify_url: `${baseUrl}/api/webhook/cinetpay`,
    return_url: `${baseUrl}${CART_ROUTES.checkoutSuccess}?transaction_id=${encodeURIComponent(transactionId)}`,
    channels: "ALL",
  });

  if (payment.code === "201" && payment.data?.payment_url) {
    redirect(payment.data.payment_url);
  }

  throw new Error(
    payment.message || "Impossible d'initialiser le paiement CinetPay"
  );
}
