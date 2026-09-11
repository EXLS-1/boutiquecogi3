// lib/product-audit/product-audit.types.ts
import type { Prisma } from "@prisma/client";

/** Client de transaction Prisma. */
export type Tx = Prisma.TransactionClient;
