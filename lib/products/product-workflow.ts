// lib/products/product-workflow.ts
// =============================================================================
// WORKFLOW PRODUIT — Transitions de statut + Historique
// =============================================================================
// Service central qui gère toutes les transitions de statut d'un produit
// (DRAFT → PENDING → PUBLISHED → ARCHIVED, SCHEDULED, etc.).
//
// RÈGLES MÉTIER :
//   - Matrice de transitions autorisées (ALLOWED_TRANSITIONS)
//   - Avant PUBLISHED : stock > 0 ET au moins 1 image obligatoire
//   - SCHEDULED : scheduledAt dans le futur → publication programmée
//   - PUBLISHED : publishedAt + publishedById
//   - Écriture systématique dans ProductStatusHistory (audit trail)
//   - Notification aux admins quand un produit passe en PENDING
// =============================================================================

import { prisma } from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";
import { notifyProductPendingApproval } from "@/lib/notifications/product-notification";

// ─── Matrice des transitions autorisées ──────────────────────────────────────
export const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  [ProductStatus.DRAFT]: [
    ProductStatus.PENDING,
    ProductStatus.PUBLISHED,
    ProductStatus.ARCHIVED,
    ProductStatus.SCHEDULED,
  ],
  [ProductStatus.PENDING]: [
    ProductStatus.DRAFT,
    ProductStatus.PUBLISHED,
    ProductStatus.ARCHIVED,
  ],
  [ProductStatus.PUBLISHED]: [
    ProductStatus.DRAFT,
    ProductStatus.ARCHIVED,
    ProductStatus.OUT_OF_STOCK,
    ProductStatus.DISCONTINUED,
  ],
  [ProductStatus.ARCHIVED]: [
    ProductStatus.DRAFT,
    ProductStatus.PUBLISHED,
  ],
  [ProductStatus.SCHEDULED]: [
    ProductStatus.DRAFT,
    ProductStatus.PUBLISHED,
    ProductStatus.ARCHIVED,
  ],
  [ProductStatus.ACTIVE]: [
    ProductStatus.DRAFT,
    ProductStatus.PUBLISHED,
    ProductStatus.ARCHIVED,
    ProductStatus.OUT_OF_STOCK,
    ProductStatus.DISCONTINUED,
  ],
  [ProductStatus.OUT_OF_STOCK]: [
    ProductStatus.PUBLISHED,
    ProductStatus.DRAFT,
    ProductStatus.ARCHIVED,
  ],
  [ProductStatus.DISCONTINUED]: [
    ProductStatus.ARCHIVED,
    ProductStatus.DRAFT,
  ],
};

// ─── Erreur métier ───────────────────────────────────────────────────────────

export class ProductWorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "ProductWorkflowError";
  }
}

// ─── Options de transition ───────────────────────────────────────────────────

export interface TransitionOptions {
  /** Raison du changement (audit) */
  reason?: string;
  /** Date de publication programmée (pour SCHEDULED) */
  scheduledAt?: Date;
  /** Id de l'utilisateur qui effectue la transition */
  actedBy?: string;
  /** Si true, envoie les notifications (PENDING) */
  notify?: boolean;
}

// ─── Helper de validation des transitions ────────────────────────────────────

export function isTransitionAllowed(
  from: ProductStatus,
  to: ProductStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

// ─── Règles métier avant publication ─────────────────────────────────────────

interface PublishableCheck {
  stock: number;
  imageCount: number;
}

export function canPublishProduct(check: PublishableCheck): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (check.stock <= 0) errors.push("Le stock doit être supérieur à 0");
  if (check.imageCount === 0) errors.push("Au moins une image est requise");
  return { ok: errors.length === 0, errors };
}

// ─── Service principal de transition ─────────────────────────────────────────

export async function updateProductStatus(
  productId: string,
  newStatus: ProductStatus,
  options: TransitionOptions = {},
): Promise<{
  id: string;
  name: string;
  status: ProductStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
}> {
  const { reason, scheduledAt, actedBy, notify = true } = options;

  // ── 1. Charger le produit avec les infos nécessaires ──
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sku: true,
      status: true,
      stock: { select: { quantity: true } },
      productImages: { select: { id: true } },
      createdBy: true,
      userId: true,
    },
  });

  if (!product) {
    throw new ProductWorkflowError("Produit introuvable", "NOT_FOUND", 404);
  }

  // ── 2. Validation de la transition ──
  if (!isTransitionAllowed(product.status, newStatus)) {
    throw new ProductWorkflowError(
      `Transition non autorisée : ${product.status} → ${newStatus}`,
      "INVALID_TRANSITION",
      400,
    );
  }

  // ── 3. Règles métier avant publication ──
  if (newStatus === ProductStatus.PUBLISHED) {
    const check = canPublishProduct({
      stock: product.stock?.quantity ?? 0,
      imageCount: product.productImages.length,
    });
    if (!check.ok) {
      throw new ProductWorkflowError(
        `Impossible de publier : ${check.errors.join(", ")}`,
        "NOT_PUBLISHABLE",
        400,
      );
    }
  }

  // ── 4. Calcul des champs dérivés ──
  const now = new Date();
  const isScheduled =
    newStatus === ProductStatus.SCHEDULED &&
    !!scheduledAt &&
    scheduledAt > now;

  if (newStatus === ProductStatus.SCHEDULED && !isScheduled) {
    throw new ProductWorkflowError(
      "La date de publication programmée (scheduledAt) doit être une date valide dans le futur",
      "INVALID_SCHEDULED_DATE",
      400,
    );
  }

  const publishedAt =
    newStatus === ProductStatus.PUBLISHED ? now : null;
  const effectiveScheduledAt = isScheduled ? scheduledAt : null;

  // ── 5. Transaction atomique : update + historique ──
  const updated = await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        status: newStatus,
        publishedAt,
        scheduledAt: effectiveScheduledAt,
        publishedById:
          newStatus === ProductStatus.PUBLISHED ? actedBy ?? null : undefined,
        updatedAt: new Date(),
        isArchived: newStatus === ProductStatus.ARCHIVED,
        isActive:
          newStatus === ProductStatus.PUBLISHED ||
          newStatus === ProductStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        status: true,
        publishedAt: true,
        scheduledAt: true,
      },
    });

    await tx.productStatusHistory.create({
      data: {
        productId,
        oldStatus: product.status,
        newStatus,
        reason: reason ?? null,
        changedById: actedBy ?? null,
      },
    });

    return updatedProduct;
  });

// ── 6. Notification aux admins quand PENDING ──
  if (notify && newStatus === ProductStatus.PENDING) {
    // Fire-and-forget : ne bloque jamais le flux principal
    notifyProductPendingApproval({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      submittedBy: product.createdBy ?? product.userId ?? undefined,
    }).catch((err) => {
      console.error("[ProductWorkflow] Notification échouée:", err);
    });
  }

  return updated;
}

// ─── Publication des produits programmés (utilisé par le cron) ───────────────

/**
 * Publie tous les produits SCHEDULED dont le scheduledAt est passé.
 * Traite par lots pour ne pas dépasser les timeouts de requêtes.
 *
 * @returns Le nombre de produits publiés
 */
export async function publishScheduledProducts(
  batchSize = 50,
): Promise<{ published: number; remaining: number }> {
  const now = new Date();

  // ── 1. Récupérer le lot de produits à publier ──
  const toPublish = await prisma.product.findMany({
    where: {
      status: ProductStatus.SCHEDULED,
      scheduledAt: { lte: now },
    },
    select: { id: true },
    take: batchSize,
  });

  let published = 0;

  // ── 2. Publier chaque produit (transaction dédiée) ──
  for (const p of toPublish) {
    const result = await prisma.$transaction(async (tx) => {
      // Vérifie sécurité : le statut doit toujours être SCHEDULED (idempotence)
      const current = await tx.product.findUnique({
        where: { id: p.id },
        select: { status: true, scheduledAt: true },
      });
      if (current?.status !== ProductStatus.SCHEDULED) return false;
      if (!current.scheduledAt || current.scheduledAt > now) return false;

      // Vérifie les règles métier
      const details = await tx.product.findUnique({
        where: { id: p.id },
        select: {
          stock: { select: { quantity: true } },
          _count: { select: { productImages: true } },
        },
      });

      const stockOk = (details?.stock?.quantity ?? 0) > 0;
      const imageOk = (details?._count.productImages ?? 0) > 0;

      if (!stockOk || !imageOk) {
        // Ne pas publier : basculer en DRAFT pour revue manuelle
        await tx.product.update({
          where: { id: p.id },
          data: { status: ProductStatus.DRAFT, scheduledAt: null },
        });
        await tx.productStatusHistory.create({
          data: {
            productId: p.id,
            oldStatus: ProductStatus.SCHEDULED,
            newStatus: ProductStatus.DRAFT,
            reason: "Publication programmée impossible : stock ou image manquant",
            changedById: null,
          },
        });
        return false;
      }

      // Publie
      await tx.product.update({
        where: { id: p.id },
        data: {
          status: ProductStatus.PUBLISHED,
          publishedAt: new Date(),
          scheduledAt: null,
          isArchived: false,
          isActive: true,
        },
      });
      await tx.productStatusHistory.create({
        data: {
          productId: p.id,
          oldStatus: ProductStatus.SCHEDULED,
          newStatus: ProductStatus.PUBLISHED,
          reason: "Publication automatique programmée",
          changedById: null,
        },
      });
      return true;
    });

    if (result) published++;
  }

  // ── 3. Compter les restants ──
  const remaining = await prisma.product.count({
    where: {
      status: ProductStatus.SCHEDULED,
      scheduledAt: { lte: now },
    },
  });

  return { published, remaining };
}
