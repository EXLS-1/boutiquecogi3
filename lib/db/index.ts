import { prisma } from '@/lib/prisma';

export { prisma };
export { getProductById, getProducts } from './product.repository';

/** Shared Prisma entry point for server-side database access. */
export const db = prisma;
