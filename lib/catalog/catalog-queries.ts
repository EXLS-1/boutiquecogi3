// lib/catalog/catalog-queries.ts

import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getRecentProducts = cache(async (limit: number) => {
  return prisma.product.findMany({
    where: {
      isArchived: false,
      isdeleted: false,
      deletedAt: null,
    },

    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],

    take: limit,

    include: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },

      availabilityProjection: {
        select: {
          isAvailable: true,
        },
      },

      productImages: {
        orderBy: {
          position: "asc",
        },

        take: 1,

        select: {
          url: true,
        },
      },
    },
  });
});
