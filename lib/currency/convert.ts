// lib/currency/convert.ts

import { DEFAULT_USD_TO_CDF_RATE } from "./currency";

export function usdToCdf(amount: number): number {
  return Math.round(amount * DEFAULT_USD_TO_CDF_RATE);
}
