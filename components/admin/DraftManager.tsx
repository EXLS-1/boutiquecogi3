"use client";

// components/admin/DraftManager.tsx
// =============================================================================
// DraftManager — Gestion des brouillons et du workflow de publication
// =============================================================================
// Affiche les produits en DRAFT, PENDING, SCHEDULED et permet :
// - Soumettre en PENDING (validation)
// - Publier directement
// - Programmer une publication (SCHEDULED)
// - Archiver
// - Voir l'historique des changements de statut
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import {
  FileEdit,
  Send,
  Eye,
  Archive,
  Calendar,
  Clock,
  CheckCircle2,
  History,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { ProductPreviewDialog } from "@/components/admin/product-preview-dialog";

type ProductStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PENDING"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "OUT_OF_STOCK"
  | "DISCONTINUED";

interface DraftProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  basePrice: number;
  stock: number;
  images?: Array<{ url: string; alt?: string | null }>;
  category?: { name: string; slug: string } | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  variantCount?: number;
  recentHistory?: Array<{
    oldStatus: ProductStatus;
    newStatus: ProductStatus;
    reason?: string | null;
    changedAt?: string;
  }>;
}

const statusConfig: Record<
  ProductStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  ACTIVE: { label: "Actif", color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
  DRAFT: { label: "Brouillon", color: "bg-gray-500", icon: <FileEdit className="h-3 w-3" /> },
  PENDING: { label: "En attente", color: "bg-yellow-500", icon: <Clock className="h-3 w-3" /> },
  SCHEDULED: { label: "Programmé", color: "bg-blue-500", icon: <Calendar className="h-3 w-3" /> },
  PUBLISHED: { label: "Publié", color: "bg-green-600", icon: <Eye className="h-3 w-3" /> },
  ARCHIVED: { label: "Archivé", color: "bg-red-500", icon: <Archive className="h-3 w-3" /> },
  OUT_OF_STOCK: { label: "Rupture", color: "bg-orange-500", icon: <Clock className="h-3 w-3" /> },
  DISCONTINUED: { label: "Arrêté", color: "bg-gray-700", icon: <Archive className="h-3 w-3" /> },
};

export function DraftManager() {
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<DraftProduct | null>(null);
const [scheduledId, setScheduledId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<DraftProduct | null>(null);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/product/drafts");
      if (!res.ok) throw new Error("Échec du chargement");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/product/drafts");
        if (!res.ok) throw new Error("Échec du chargement");
        const data = await res.json();
        if (!cancelled) setProducts(data.products || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: ProductStatus, reason?: string, scheduledDate?: string) => {
      setActionLoading(id);
      try {
        const res = await fetch(`/api/product/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            reason,
            ...(scheduledDate ? { scheduledAt: scheduledDate } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Échec de la mise à jour");
        }

        await fetchDrafts();
        setScheduledId(null);
        setScheduledDate("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchDrafts],
  );

  const formatDate = (date?: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Brouillons & Validation</h2>
          <p className="text-sm text-muted-foreground">
            Gérez le workflow de publication des produits
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDrafts} className="gap-1">
          <RefreshCw className="h-3 w-3" />
          Actualiser
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Aucun brouillon en attente
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {products.map((product) => {
            const cfg = statusConfig[product.status];
            return (
              <div key={product.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Image + infos */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {product.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      className="h-12 w-12 rounded object-cover bg-muted"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      NA
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {product.sku} • {(product.basePrice / 100).toFixed(2)} $ • {product.stock} en stock
                      {product.category ? ` • ${product.category.name}` : ""}
                    </p>
                  </div>
                </div>

                {/* Statut */}
                <Badge className={cn(cfg.color, "text-white gap-1 shrink-0")}>
                  {cfg.icon}
                  {cfg.label}
                </Badge>

{/* Aperçu */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setPreviewProduct(product)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Aperçu
                </Button>

                {/* Historique */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectedHistory(product)}
                >
                  <History className="h-3 w-3 mr-1" />
                  Histo
                </Button>

                {/* Actions */}
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {product.status === "DRAFT" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === product.id}
                        onClick={() => updateStatus(product.id, "PENDING", "Soumission pour validation")}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Soumettre
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionLoading === product.id}
                        onClick={() => updateStatus(product.id, "PUBLISHED", "Publication directe")}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Publier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === product.id}
                        onClick={() => setScheduledId(product.id)}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Programmer
                      </Button>
                    </>
                  )}

                  {product.status === "PENDING" && (
                    <Button
                      size="sm"
                      disabled={actionLoading === product.id}
                      onClick={() => updateStatus(product.id, "PUBLISHED", "Approbation admin")}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approuver
                    </Button>
                  )}

                  {(product.status === "PUBLISHED" || product.status === "ACTIVE") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionLoading === product.id}
                      onClick={() => updateStatus(product.id, "ARCHIVED", "Retrait manuel")}
                    >
                      <Archive className="h-3 w-3 mr-1" />
                      Retirer
                    </Button>
                  )}
                </div>

                {/* Programmation inline */}
                {scheduledId === product.id && (
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="text-xs h-8 px-2 rounded-md border bg-background"
                    />
                    <Button
                      size="sm"
                      disabled={!scheduledDate || actionLoading === product.id}
                      onClick={() =>
                        updateStatus(product.id, "SCHEDULED", "Publication programmée", scheduledDate)
                      }
                    >
                      Confirmer
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal historique */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Historique — {selectedHistory.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedHistory(null)}>
                ✕
              </Button>
            </div>
            {selectedHistory.recentHistory && selectedHistory.recentHistory.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {selectedHistory.recentHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted">
                    <Badge variant="outline" className="text-xs">
                      {h.oldStatus}
                    </Badge>
                    <span>→</span>
                    <Badge className={`text-xs ${statusConfig[h.newStatus].color}`}>
                      {h.newStatus}
                    </Badge>
                    <span className="text-muted-foreground text-xs ml-auto">
                      {formatDate(h.changedAt)}
                    </span>
                    {h.reason && <p className="text-xs italic w-full">{h.reason}</p>}
                  </div>
                ))}
              </div>
) : (
              <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
            )}
          </div>
        </div>
      )}

      {/* Modal aperçu */}
      {previewProduct && (
        <ProductPreviewDialog
          productId={previewProduct.id}
          productName={previewProduct.name}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  );
}
