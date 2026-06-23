// lib/currency/convert.ts

import { DEFAULT_USD_TO_CDF_RATE } from "@/lib/exchange-rate/exchange-rate-constants";

export function usdToCdf(amount: number): number {
  return Math.round(amount * DEFAULT_USD_TO_CDF_RATE);
}

export function cdfToUsd(amount: number): number {
  return Math.round(amount / DEFAULT_USD_TO_CDF_RATE);
}
