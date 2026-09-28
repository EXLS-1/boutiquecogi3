// components/product-price/price.tsx

"use client";

import { useMemo } from "react";
import type { Currency } from "@prisma/client";
import type { MoneyCents } from "@/lib/product/pricing/price.types";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { useCurrencyStore } from "@/store/use-currency-store";

interface PriceProps {
  /** Current resolved amount, in domain cents and in `currency`. */
  amount: MoneyCents;
  currency: Currency;
  className?: string;
  /** Resolved compare-at amount, in cents of the same currency. */
  originalAmount?: MoneyCents | null;
  size?: "sm" | "md" | "lg" | "xl";
}

function toDisplayAmount(amountCents: number, source: Currency, target: Currency, rate: number | null) {
  if (!Number.isFinite(amountCents) || amountCents < 0) return { amount: null, currency: source };
  const majorAmount = amountCents / 100;
  if (source === target) return { amount: majorAmount, currency: target };
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    return { amount: majorAmount, currency: source };
  }
  return {
    amount: source === "USD" ? majorAmount * rate : majorAmount / rate,
    currency: target,
  };
}

export default function Price({
  amount,
  currency,
  className,
  originalAmount,
  size = "md",
}: PriceProps) {
  const { currency: displayCurrency, rate } = useCurrencyStore();
  const sizeClasses: Record<NonNullable<PriceProps["size"]>, string> = {
    sm: "text-sm",
    md: "text-base font-semibold",
    lg: "text-xl font-bold",
    xl: "text-3xl font-extrabold",
  };

  const formatted = useMemo(() => {
    const result = toDisplayAmount(amount, currency, displayCurrency, rate);
    return result.amount === null
      ? "—"
      : formatCurrency(result.amount, { currency: result.currency });
  }, [amount, currency, displayCurrency, rate]);

  const formattedOriginal = useMemo(() => {
    if (originalAmount == null || originalAmount <= amount || !Number.isFinite(originalAmount)) return null;
    const result = toDisplayAmount(originalAmount, currency, displayCurrency, rate);
    return result.amount === null
      ? null
      : formatCurrency(result.amount, { currency: result.currency });
  }, [amount, currency, displayCurrency, originalAmount, rate]);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("text-cyan-900 dark:text-cyan-100", sizeClasses[size])}>
        {formatted}
      </span>
      {formattedOriginal && (
        <span className="text-sm text-rose-500 line-through opacity-70">
          {formattedOriginal}
        </span>
      )}
    </div>
  );
}
