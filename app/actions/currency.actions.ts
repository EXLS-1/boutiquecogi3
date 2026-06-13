// app/actions/currency.actions.ts

"use server";
import { cookies } from "next/headers";
import type { DisplayCurrency } from "@/lib/currency/currency";

export async function setDisplayCurrency(currency: DisplayCurrency) {
  (await cookies()).set("displayCurrency", currency, {
    maxAge: 60 * 60 * 24 * 365, // 1 an
    path: "/",
  });
}

export async function deleteDisplayCurrency() {
  (await cookies()).delete("displayCurrency");
}
