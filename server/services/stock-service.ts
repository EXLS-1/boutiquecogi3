import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { recordAuditLog, getAuditActorId, AuditSeverity } from "@/server/services/audit.service";
import type { StockMovementType } from "@prisma/client";

export class StockServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "StockServiceError";
  }
}

export const StockService = {
  // ─── Initialiser le stock d'un produit ───
  async createForProduct(
    productId: string,
    initialQty: number = 0,
    userId?: string
  ) {
    const effectiveUserId = userId ?? (await getAuditActorId());
    const stock = await prisma.stock.create({
      data: {
        id: generateUUIDv7(),
        productId,
        quantity: initialQty,
        reserved: 0,
        alertThreshold: 10,
        updatedBy: effectiveUserId ?? undefined,
      },
      include: { product: true },
    });

    await recordAuditLog({
      action: "STOCK_INIT",
      targetId: productId,
      targetType: "PRODUCT",
      userId: effectiveUserId,
      severity: AuditSeverity.INFO,
      details: { initialQty },
    });

    return stock;
  },

  // ─── Récupérer le stock avec le produit ───
  async getByProductId(productId: string) {
    return prisma.stock.findUnique({
      where: { productId },
      include: {
        product: {
          select: { id: true, name: true, slug: true, basePrice: true },
        },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { name: true } } },
        },
      },
    });
  },

  // ─── Lister tous les stocks (Admin) ───
  async listAll() {
    return prisma.stock.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            images: true,
          },
        },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { user: { select: { name: true } } },
        },
      },
    });
  },

  // ─── Calculer la disponibilité ───
  getAvailable(stock: { quantity: number; reserved: number }): number {
    return Math.max(0, stock.quantity - stock.reserved);
  },

  // ─── Ajuster le stock (IN/OUT/ADJUSTMENT) ───
  async adjust(
    productId: string,
    type: StockMovementType,
    quantity: number,
    reason?: string,
    userId?: string,
    orderId?: string
  ) {
    const effectiveUserId = userId ?? (await getAuditActorId());
    const stock = await prisma.stock.findUnique({ where: { productId } });
    if (!stock) {
      await recordAuditLog({
        action: "STOCK_ADJUST",
        targetId: productId,
        targetType: "PRODUCT",
        userId: effectiveUserId,
        severity: AuditSeverity.WARNING,
        status: "FAILURE",
        error: "Stock introuvable",
      });
      throw new StockServiceError("Stock introuvable", "NOT_FOUND");
    }

    const delta = this.computeDelta(type, quantity);
    const newQuantity = stock.quantity + delta;
    const newReserved = this.computeReserved(type, quantity, stock.reserved);

    if (newQuantity < 0) {
      await recordAuditLog({
        action: "STOCK_ADJUST",
        targetId: productId,
        targetType: "PRODUCT",
        userId: effectiveUserId,
        severity: AuditSeverity.WARNING,
        status: "FAILURE",
        error: "Stock insuffisant",
        details: {
          currentQuantity: stock.quantity,
          requestedDelta: delta,
        },
      });
      throw new StockServiceError("Stock insuffisant", "INSUFFICIENT_STOCK");
    }

    const isReserveOrRelease = type === "RESERVATION" || type === "RELEASE";
    const actionName =
      type === "RESERVATION"
        ? "STOCK_RESERVE"
        : type === "RELEASE"
        ? "STOCK_RELEASE"
        : "STOCK_ADJUST";
    const severity = isReserveOrRelease
      ? AuditSeverity.INFO
      : newQuantity === 0
      ? AuditSeverity.CRITICAL
      : AuditSeverity.WARNING;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mise à jour du stock
      const updated = await tx.stock.update({
        where: { productId },
        data: {
          quantity: newQuantity,
          reserved: newReserved,
          lastMovementAt: new Date(),
          updatedBy: effectiveUserId ?? undefined,
        },
      });

      // 2. Création du mouvement (audit)
      await tx.stockMovement.create({
        data: {
          id: generateUUIDv7(),
          stockId: stock.id,
          type,
          quantity,
          delta,
          reason,
          orderId,
          userId: effectiveUserId ?? undefined,
        },
      });

      return updated;
    });

    await recordAuditLog({
      action: actionName,
      targetId: productId,
      targetType: "PRODUCT",
      userId: effectiveUserId,
      severity,
      details: {
        type,
        quantity,
        delta,
        previousQuantity: stock.quantity,
        newQuantity,
        reason,
        orderId,
      },
    });

    return result;
  },

  // ─── Réserver du stock (quand une commande est confirmée) ───
  async reserve(
    productId: string,
    quantity: number,
    orderId: string,
    userId?: string
  ) {
    return this.adjust(
      productId,
      "RESERVATION",
      quantity,
      `Réservation commande ${orderId}`,
      userId,
      orderId
    );
  },

  // ─── Libérer du stock (annulation commande) ───
  async release(
    productId: string,
    quantity: number,
    orderId: string,
    userId?: string
  ) {
    return this.adjust(
      productId,
      "RELEASE",
      quantity,
      `Libération commande ${orderId}`,
      userId,
      orderId
    );
  },

  // ─── Retirer du stock (vente / sortie explicite) ───
  async removeStock(
    productId: string,
    quantity: number,
    reason?: string,
    userId?: string,
    orderId?: string
  ) {
    return this.adjust(
      productId,
      "OUT",
      quantity,
      reason ?? "Sortie de stock",
      userId,
      orderId
    );
  },

  // ─── Helpers privés ───
  computeDelta(type: StockMovementType, qty: number): number {
    switch (type) {
      case "IN":
      case "RETURN":
      case "RELEASE":
        return Math.abs(qty);
      case "OUT":
      case "RESERVATION":
        return -Math.abs(qty);
      case "ADJUSTMENT":
        return qty; // Peut être positif ou négatif
    }
  },

  computeReserved(
    type: StockMovementType,
    qty: number,
    currentReserved: number
  ): number {
    switch (type) {
      case "RESERVATION":
        return currentReserved + Math.abs(qty);
      case "RELEASE":
      case "OUT": // Expédition consomme la réservation
        return Math.max(0, currentReserved - Math.abs(qty));
      default:
        return currentReserved;
    }
  },
};
