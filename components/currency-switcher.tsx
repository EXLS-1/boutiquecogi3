// /components/currency-switcher.tsx
"use client";

import { useEffect, useState } from "react";
import { useCurrencyStore } from "@/store/use-currency-store";
import { Button } from "@/components/ui/button";

/**
 * Sélecteur simple pour basculer USD <-> CDF.
 * Stocke la préférence dans un cookie via le store.
 */
export function CurrencySwitcher() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const rate = useCurrencyStore((s) => s.rateUsdToCdf);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center text-cyan-400 font-lato">
    
        <Button
          variant={currency === "CDF" ? "default" : "ghost"}
          size="sm"
          className="hover:text-rose-400 transition-colors"
          onClick={() => setCurrency("CDF")}
        >
          CDF
        </Button>
        <div className="text-sm">/</div>
        <Button
          variant={currency === "USD" ? "default" : "ghost"}
          size="sm"
          className="hover:text-rose-400 transition-colors"
          onClick={() => setCurrency("USD")}
        >
          USD
        </Button>
      
    </div>
  );
}
