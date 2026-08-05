// app/checkout/_components/checkout-client.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import useCart from "@/store/use-cart";
import { setDisplayCurrency } from "@/lib/actions/currency.actions";
import type { DisplayCurrency } from "@/lib/currency/exchange-rate-types";
import { processCinetPayCheckout } from "@/lib/actions/checkout.action";

export default function CheckoutClient({ user }: { user: any }) {
  // Les hooks sont désormais parfaitement synchrones au premier niveau
  const { items } = useCart();
  const [activeCurrency, setActiveCurrency] = useState<DisplayCurrency>("USD");

  const handleCurrencySwitch = async (curr: DisplayCurrency) => {
    setActiveCurrency(curr);
    await setDisplayCurrency(curr); // Si c'est une Server Action, c'est valide
  };

  const totalUSD = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Correction : font-semibold au lieu de font-bold pour éviter l'écrasement */}
      <h1 className="text-2xl font-semibold mb-6">Finaliser ma commande</h1>
      
      {/* Correction : gap-2 au lieu de space-x-2 */}
      <div className="flex justify-end mb-4 gap-2">
        <Button variant={activeCurrency === "USD" ? "default" : "outline"} onClick={() => handleCurrencySwitch("USD")}>
          USD
        </Button>
        <Button variant={activeCurrency === "CDF" ? "default" : "outline"} onClick={() => handleCurrencySwitch("CDF")}>
          CDF
        </Button>
      </div>

      <form action={processCinetPayCheckout} className="max-w-md mx-auto">
        <input type="hidden" name="items" value={JSON.stringify(items)} />
        <input type="hidden" name="amount" value={totalUSD} />
        <input type="hidden" name="currency" value={activeCurrency} />
        
        <div>
          {/* Correction : htmlFor pour l'accessibilité */}
          <label htmlFor="cinetpay-phone" className="block text-sm font-medium mb-1">
            Numéro Mobile Money
          </label>
          <input 
            id="cinetpay-phone"
            type="tel" 
            name="phone" 
            placeholder="+243 XXX XXX XXX" 
            required 
            // Correction : border-zinc-300 au lieu de border-slate-300
            className="w-full p-3 rounded border border-zinc-300 focus:ring-2 focus:ring-turquoise outline-none"
          />
          <p className="text-xs text-zinc-500 mt-1">
            M-Pesa, Orange Money ou Airtel Money.
          </p>
        </div>

        <button 
          type="submit" 
          className="w-full mt-6 bg-turquoise hover:bg-zinc-900 text-white font-semibold py-4 rounded-lg transition-colors shadow-lg"
        >
          Payer par Mobile Money
        </button>
   
        {/* Correction : gap-4 au lieu de space-x-4 */}
        <div className="mt-8 flex justify-center gap-4 opacity-50 grayscale">
          <span className="text-xs font-semibold">M-PESA</span>
          <span className="text-xs font-semibold">ORANGE</span>
          <span className="text-xs font-semibold">AIRTEL</span>
        </div>     
      </form>
    </div>
  );
}