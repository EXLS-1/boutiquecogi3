// components/price/currency-switcher.tsx
"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useCurrencyStore } from "@/store/use-currency-store";
import { cn } from "@/lib/utils/utils";

import { formatPriceFromUsdCents } from "@/lib/currency/price-format";

export default function CurrencySwitcher() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const router = useRouter();

  const handleCurrencyChange = async (newCurrency: "USD" | "CDF") => {
    if (newCurrency === currency) return;
    await setCurrency(newCurrency);
    router.refresh();
  };

  return (
    <div
      className="flex items-center text-cyan-400 font-lato min-w-[100px] justify-center"
      suppressHydrationWarning
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "hover:text-pink-400 transition-colors px-2",
          currency === "CDF" &&
            "text-pink-400 underline decoration-2 underline-offset-4 font-bold"
        )}
        disabled={currency === "CDF"}
        onClick={() => handleCurrencyChange("CDF")}
      >
        CDF
      </Button>
      <div className="text-sm">/</div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "hover:text-pink-400 transition-colors px-2",
          currency === "USD" &&
            "text-pink-400 underline decoration-2 underline-offset-4 font-bold"
        )}
        disabled={currency === "USD"}
        onClick={() => handleCurrencyChange("USD")}
      >
        USD
      </Button>
    </div>
  );
}

/**
 * Helper conservé pour compatibilité éventuelle des imports.
 *
 * amountInUSD = montant en cents USD.
 */
export function displayPrice(
  amountInUSD: number,
  currency: "USD" | "CDF",
  exchangeRate: number
) {
  return formatPriceFromUsdCents(
    { amountInUsdCents: amountInUSD, rate: exchangeRate },
    currency
  );
}

