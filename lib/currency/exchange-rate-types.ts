// lib/exchange-rate/exchange-rate-types.ts
// Définit les types TypeScript pour le module de taux de change.
import { Prisma } from "@prisma/client";

// Représente un taux de change USD/CDF validé.
export type ExchangeRate = Prisma.Decimal;
