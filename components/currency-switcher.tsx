// /components/currency-switcher.tsx
"use client";

import { useEffect, useState } from "react";
import { useCurrencyStore } from "@/store/use-currency-store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  // Empêche le Layout Shift en réservant l'espace exact (h-9 correspond au bouton size="sm")
  if (!mounted) {
    return (
      <div className="flex items-center text-cyan-400/50 font-lato h-9 px-2">
        <div className="w-8 h-4 bg-cyan-100/20 rounded animate-pulse" />
        <div className="mx-2 text-sm">/</div>
        <div className="w-8 h-4 bg-cyan-100/20 rounded animate-pulse" />
      </div>
    );
  }

  const handleCurrencyChange = (newCurrency: "USD" | "CDF") => {
    if (newCurrency === currency) return;
    
    setCurrency(newCurrency);
    // router.refresh() force Next.js à re-fetch les Server Components (comme page.tsx)
    // Cela synchronise le cookie mis à jour avec le prop 'activeCurrency' du ProductCatalog
    router.refresh();
  };

  return (
    <div className="flex items-center text-cyan-400 font-lato">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "hover:text-pink-400 transition-colors px-2",
            currency === "CDF" && "text-pink-400 underline decoration-2 underline-offset-4 font-bold pointer-events-none"
          )}
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
            currency === "USD" && "text-pink-400 underline decoration-2 underline-offset-4 font-bold pointer-events-none"
          )}
          onClick={() => handleCurrencyChange("USD")}
        >
          USD
        </Button>
      
    </div>
  );
}
