

"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils/utils";
import { useCurrencyStore } from "@/store/use-currency-store";

interface PriceProps {
  /** Montant en unité de base (Cents pour USD, Unité pour CDF) */
  amount: number;
  /** Devise forcée ou calculée selon le store si absent */
  currency?: "USD" | "CDF";
  /** Style optionnel */
  className?: string;
  /** Affiche le prix original si promo (en cents) */
  originalAmount?: number;
  /** Taille du texte */
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Composant Price : Gère la conversion USD/CDF et le formatage local.
 * Utilise la précision Intl pour la robustesse financière.
 */
export function Price({
  amount,
  currency: forcedCurrency,
  className,
  originalAmount,
  size = "md",
}: PriceProps) {
  const currencyStore = useCurrencyStore();
  const storeCurrency = currencyStore.currency;
  const exchangeRate = (currencyStore as any).exchangeRate ?? 1;
  const activeCurrency = forcedCurrency || storeCurrency;

  const formattedPrice = useMemo(() => {
    let finalAmount = amount;

    // Logique de conversion : USD (cents) -> CDF
    if (activeCurrency === "CDF") {
      // On multiplie par le taux (ex: 2800) et on arrondit à l'unité
      finalAmount = (amount / 100) * exchangeRate;
    } else {
      // USD : on repasse des cents aux dollars
      finalAmount = amount / 100;
    }

    return new Intl.NumberFormat(activeCurrency === "CDF" ? "fr-CD" : "en-US", {
      style: "currency",
      currency: activeCurrency,
      minimumFractionDigits: activeCurrency === "CDF" ? 0 : 2,
    }).format(finalAmount);
  }, [amount, activeCurrency, exchangeRate]);

  const sizeClasses = {
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
          {new Intl.NumberFormat(activeCurrency === "CDF" ? "fr-CD" : "en-US", {
            style: "currency",
            currency: activeCurrency,
            minimumFractionDigits: activeCurrency === "CDF" ? 0 : 2,
          }).format(activeCurrency === "CDF" ? (originalAmount / 100) * exchangeRate : originalAmount / 100)}
        </span>
      )}
    </div>
  );
}