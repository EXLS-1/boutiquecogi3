// lib/actions/currency.actions.ts

"use server";

import { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import type { DisplayCurrency } from "@/lib/currency/exchange-rate-types";

export async function setDisplayCurrency(currency: DisplayCurrency) {
  (await cookies()).set("displayCurrency", currency, {
    maxAge: 60 * 60 * 24 * 365, // 1 an
    path: "/",
  });
}

export async function deleteDisplayCurrency() {
  (await cookies()).delete("displayCurrency");
}

/**
 * Récupère les taux de change récents depuis la base.
 * Le modèle ExchangeRate utilise baseCurrency / quoteCurrency / rate / source / effectiveAt.
 */
export async function getExchangeRates(
  from: Currency = Currency.USD,
  to: Currency = Currency.CDF,
) {
  const rates = await prisma.exchangeRate.findMany({
    where: { baseCurrency: from, quoteCurrency: to },
    orderBy: { effectiveAt: "desc" },
    take: 10,
  });

  return rates;
}

/**
 * Convertit un montant de `from` vers `to` en utilisant le taux le plus récent.
 * @throws Error si aucun taux n'est trouvé
 */
export async function convertPrice(
  amount: number,
  from: Currency,
  to: Currency,
) {
  const rate = await prisma.exchangeRate.findFirst({
    where: { baseCurrency: from, quoteCurrency: to },
    orderBy: { effectiveAt: "desc" },
  });

  if (!rate) throw new Error(`Taux ${from}/${to} non trouvé`);
  return amount * rate.rate.toNumber();
}
