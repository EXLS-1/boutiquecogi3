import { Prisma } from '@prisma/client';

/**
 * Arguments de sélection pour le modèle Product utilisé dans le Dashboard.
 * Centralisé pour garantir que la requête (Server) et le type (Client) sont identiques.
 */
export const dashboardProductArgs = {
  include: {
    category: { select: { id: true, name: true } },
    variants: { select: { id: true } },
    _count: { select: { productReviews: true, orderItems: true } },
  },
} as const;

export type DashboardProductWithRelations = Prisma.ProductGetPayload<
  typeof dashboardProductArgs
>;
