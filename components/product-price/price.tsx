// components/price/price.tsx
// ce composant gère l'affichage du prix en fonction de la devise active (USD ou CDF) et du taux de change.

"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils/utils";
import { useCurrencyStore } from "@/store/use-currency-store";
import {
  computeConvertedAmountForOriginal,
  formatPriceFromUsdCents,
} from "@/lib/currency/price-format";

interface PriceProps {
  /** Montant en unité de base (Cents pour USD) */
  amount: number;
  /** Devise selon le store (conservée pour compatibilité props historiques) */
  currency: "USD" | "CDF";
  className?: string;
  /** Affiche le prix original si promo (en cents USD) */
  originalAmount?: number;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Price({
  amount,
  // props historique: la devise affichée est prise en charge par le store
  currency: _currency,
  className,
  originalAmount,
  size = "md",
}: PriceProps) {
  const currencyStore = useCurrencyStore();
  const activeCurrency = currencyStore.currency;

  const formattedPrice = useMemo(() => {
    return formatPriceFromUsdCents(
      { amountInUsdCents: amount, rate: currencyStore.rate },
      activeCurrency
    );
  }, [amount, activeCurrency, currencyStore.rate]);

  const sizeClasses: Record<NonNullable<PriceProps["size"]>, string> = {
    sm: "text-sm",
    md: "text-base font-semibold",
    lg: "text-xl font-bold",
    xl: "text-3xl font-extrabold",
  };

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("text-cyan-900 dark:text-cyan-100", sizeClasses[size])}>
        {formattedPrice}
      </span>

      {originalAmount && originalAmount > amount && (
        <span className="text-sm text-rose-500 line-through opacity-70">
          {(() => {
            const converted = computeConvertedAmountForOriginal(
              { amountInUsdCents: amount, rate: currencyStore.rate },
              activeCurrency,
              originalAmount
            );

            return new Intl.NumberFormat(activeCurrency === "USD" ? "en-US" : "fr-CD", {
              style: "currency",
              currency: activeCurrency,
              minimumFractionDigits: activeCurrency === "USD" ? 2 : 0,
            }).format(converted);
          })()}
        </span>
      )}
    </div>
  );
}

