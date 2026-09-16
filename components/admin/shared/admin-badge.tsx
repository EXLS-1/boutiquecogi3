// components/admin/shared/admin-badge.tsx
// =============================================================================
// BADGE ADMIN — Sémantique de ton homogène sur toutes les pages d'observation
// =============================================================================
// Server Component (aucun état) : utilisable dans les pages RSC comme dans les
// composants client.

import { cn } from "@/lib/utils/cn";

export type AdminTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";

const TONE_CLASSES: Record<AdminTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  accent: "bg-cyan-50 text-cyan-700 ring-cyan-200",
};

interface AdminBadgeProps {
  readonly children: React.ReactNode;
  readonly tone?: AdminTone;
  readonly className?: string;
}

export function AdminBadge({
  children,
  tone = "neutral",
  className,
}: AdminBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Table de correspondance statut → ton.
 * Couvre les statuts métier réellement présents au schéma, en LECTURE SEULE :
 * un statut inconnu retombe sur « neutral » (jamais d'exception d'affichage).
 */
const STATUS_TONES: Record<string, AdminTone> = {
  // Order / Shipment
  PENDING: "warning",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "accent",
  IN_TRANSIT: "accent",
  DELIVERED: "success",
  CANCELLED: "neutral",
  REFUNDED: "danger",
  EXCEPTION: "danger",
  // Return
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  RECEIVED: "accent",
  // Payment / Refund
  COMPLETED: "success",
  FAILED: "danger",
  // Produit
  DRAFT: "neutral",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
  // Génériques
  ACTIVE: "success",
  INACTIVE: "neutral",
  ON: "success",
  OFF: "neutral",
};

/** Badge de statut : dérive automatiquement le ton depuis le code statut. */
export function StatusBadge({
  status,
  label,
}: {
  readonly status: string | null | undefined;
  readonly label?: string;
}) {
  if (!status) return <AdminBadge tone="neutral">—</AdminBadge>;
  return (
    <AdminBadge tone={STATUS_TONES[status] ?? "neutral"}>
      {label ?? status}
    </AdminBadge>
  );
}