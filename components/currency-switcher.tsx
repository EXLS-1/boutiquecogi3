// /components/currency-switcher.tsx
"use client";

import { useEffect, useState } from "react";
import { useCurrencyStore } from "@/store/use-currency-store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

/**
 * Sélecteur simple pour basculer USD <-> CDF.
 * Stocke la préférence dans un cookie via le store.
 */
export function CurrencySwitcher() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCurrencyChange = (newCurrency: "USD" | "CDF") => {
    if (newCurrency === currency) return;
    
    setCurrency(newCurrency);
    router.refresh();
  };

  return (
    <div 
      className="flex items-center text-cyan-400 font-lato min-w-[100px] justify-center"
      suppressHydrationWarning
    >
      {!mounted ? (
        <div className="flex items-center gap-2 px-2 h-9 animate-pulse opacity-50">
          <div className="w-8 h-4 bg-current/20 rounded" />
          <span className="text-xs">/</span>
          <div className="w-8 h-4 bg-current/20 rounded" />
        </div>
      ) : (
        <>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "hover:text-pink-400 transition-colors px-2",
            currency === "CDF" && "text-pink-400 underline decoration-2 underline-offset-4 font-bold"
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
            currency === "USD" && "text-pink-400 underline decoration-2 underline-offset-4 font-bold"
          )}
          disabled={currency === "USD"}
          onClick={() => handleCurrencyChange("USD")}
        >
          USD
        </Button>
        </>
      )}
    </div>
  );
}
