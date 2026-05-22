/**
 * Type validation test for CurrencyState
 * This file is used to validate TypeScript types only and is not executed
 */
import { useCurrencyStore } from "./use-currency-store";

// Type validation - these should all compile without errors
const testTypeValidation = () => {
  // Test 1: currency property exists and has correct type
  const currency = useCurrencyStore((s) => s.currency);
  const currencyCheck: "USD" | "CDF" = currency;

  // Test 2: setCurrency function exists and accepts DisplayCurrency
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  setCurrency("USD");
  setCurrency("CDF");

  // Test 3: rateUsdToCdf property exists and is a number
  const rate = useCurrencyStore((s) => s.rateUsdToCdf);
  const rateCheck: number = rate;

  // Test 4: setDisplayCurrency still works (backward compatibility)
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplayCurrency);
  setDisplayCurrency("USD");

  // Test 5: displayCurrency property exists
  const displayCurrency = useCurrencyStore((s) => s.displayCurrency);
  const displayCheck: "USD" | "CDF" = displayCurrency;

  // Test 6: formatPrice function exists
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  const formatted: string = formatPrice(1000);

  return {
    currency: currencyCheck,
    rate: rateCheck,
    displayCurrency: displayCheck,
    formatted,
  };
};

export { testTypeValidation };
