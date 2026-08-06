// prisma/seed/factories/shipment.factory.ts
// ============================================
// GÉNÉRATEUR DE LIVRAISONS & SUIVI
// ============================================

import { ShipmentStatus } from "@prisma/client";
import { generateDeterministicUuidV7 } from "../utils/uuid";
import { createSeededRandom, randInt } from "../utils/random";

export interface GeneratedShipment {
  id: string;
  orderId: string;
  carrierId: string | null;
  shippingMethodId: string | null;
  trackingNumber: string;
  status: ShipmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

const CARRIER_HINTS = ["KIN", "LUB", "GOM", "MBJ"] as const;

/**
 * Construit une expédition pour une commande.
 * Le statut est lié au statut de la commande (fourni explicitement).
 */
export function buildShipmentFactory(
  index: number,
  orderId: string,
  seedNumber: number,
  options: {
    carrierId?: string | null;
    shippingMethodId?: string | null;
    status?: ShipmentStatus;
  } = {},
): GeneratedShipment {
  const rand = createSeededRandom(seedNumber, "shipment", index);
  const carrierHint = CARRIER_HINTS[index % CARRIER_HINTS.length];
  const status = options.status ?? ShipmentStatus.PENDING;

  const shippedAt =
    status === ShipmentStatus.SHIPPED || status === ShipmentStatus.IN_TRANSIT || status === ShipmentStatus.DELIVERED
      ? new Date(Date.now() - randInt(rand, 1, 5) * 86400000)
      : null;
  const deliveredAt = status === ShipmentStatus.DELIVERED ? new Date(Date.now() - randInt(rand, 1, 3) * 86400000) : null;

  return {
    id: generateDeterministicUuidV7("shipment", index),
    orderId,
    carrierId: options.carrierId ?? null,
    shippingMethodId: options.shippingMethodId ?? null,
    trackingNumber: `TRK-${carrierHint}-${String(index).padStart(8, "0")}`,
    status,
    shippedAt,
    deliveredAt,
  };
}
