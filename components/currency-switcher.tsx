// /components/currency-selector.tsx
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
    <div className="flex items-center gap-3">
      <div className="text-sm text-gray-600">Devise</div>
      <div className="flex items-center gap-2">
        <Button
          variant={currency === "USD" ? "default" : "ghost"}
          size="sm"
          onClick={() => setCurrency("USD")}
        >
          USD
        </Button>
        <Button
          variant={currency === "CDF" ? "default" : "ghost"}
          size="sm"
          onClick={() => setCurrency("CDF")}
        >
          CDF
        </Button>
      </div>
      <div className="text-xs text-gray-500">
        {rate ? `1 USD ≈ ${rate.toLocaleString()} CDF` : "Taux indisponible"}
      </div>
    </div>
  );
}
