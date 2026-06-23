// lib/actions/currency.actions.ts

"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import type { DisplayCurrency } from "@/lib/currency/exchange-rate-currency";

export async function setDisplayCurrency(currency: DisplayCurrency) {
  (await cookies()).set("displayCurrency", currency, {
    maxAge: 60 * 60 * 24 * 365, // 1 an
    path: "/",
  });
}

export async function deleteDisplayCurrency() {
  (await cookies()).delete("displayCurrency");
}

export async function getExchangeRates() {
  // Récupération depuis la DB ou cache serveur
  const rates = await prisma.exchangeRate.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  return rates;
}

export async function convertPrice(amount: number, from: string, to: string) {
  const rate = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: from,
      toCurrency: to,
      isActive: true,
    },
  });

  if (!rate) throw new Error(`Taux ${from}/${to} non trouvé`);
  return amount * rate.rate;
}
