// lib/currency/get-current-rate.ts

import { prisma } from "@/lib/prisma";

import { DEFAULT_USD_TO_CDF_RATE } from "./currency";

export async function getCurrentUsdToCdfRate() {
  const config = await prisma.appConfig.findFirst({
    select: {
      usdToCdfRate: true,
    },
  });

  return config?.usdToCdfRate ?? DEFAULT_USD_TO_CDF_RATE;
}
