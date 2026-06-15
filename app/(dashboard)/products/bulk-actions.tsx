// /app/(dashboard)/products/BulkActions.tsx
// ============================================
// Client Component — Actions groupées sur les produits
// ============================================

"use client";

import { useState, useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS, type Permission } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  SelectAll,
  Trash2,
  Package,
  Tag,
  Archive,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface BulkActionsProps {
  /** Permissions pré-récupérées par le Server Component parent */
  permissions: Permission[];
  /** IDs des produits actuellement sélectionnés */
  selectedIds: string[];
  /** Callback quand la sélection change */
  onSelectionChange?: (ids: string[]) => void;
  /** Callback après action réussie (pour revalidation) */
  onActionComplete?: () => void;
  /** Nombre total de produits (pour "Sélectionner tout") */
  totalCount?: number;
}

type BulkActionType =
  | "delete"
  | "activate"
  | "deactivate"
  | "archive"
  | "change-category"
  | "export";

interface BulkActionConfig {
  id: BulkActionType;
  label: string;
  icon: React.ReactNode;
  permission: Permission;
  variant?: "default" | "destructive";
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
}

// ───────────────────────────────────────────
// CONFIGURATION DES ACTIONS
// ───────────────────────────────────────────

const BULK_ACTIONS: BulkActionConfig[] = [
  {
    id: "activate",
    label: "Activer",
    icon: <Package className="h-4 w-4" />,
    permission: PERMISSIONS.PRODUCTS_UPDATE,
  },
  {
    id: "deactivate",
    label: "Désactiver",
    icon: <Archive className="h-4 w-4" />,
    permission: PERMISSIONS.PRODUCTS_UPDATE,
  },
  {
    id: "change-category",
    label: "Changer de catégorie",
    icon: <Tag className="h-4 w-4" />,
    permission: PERMISSIONS.PRODUCTS_UPDATE,
  },
  {
    id: "archive",
    label: "Archiver",
    icon: <Archive className="h-4 w-4" />,
    permission: PERMISSIONS.PRODUCTS_BULK_EDIT,
  },
  {
    id: "export",
    label: "Exporter la sélection",
    icon: <SelectAll className="h-4 w-4" />,
    permission: PERMISSIONS.PRODUCTS_EXPORT,
  },
  {
    id: "delete",
    label: "Supprimer",
    icon: <Trash2 className="h-4 w-4" />,
    permission: PERMISSIONS.PRODUCTS_DELETE,
    variant: "destructive",
    requiresConfirmation: true,
    confirmationTitle: "Supprimer les produits sélectionnés",
    confirmationDescription:
      "Cette action est irréversible. Les produits sélectionnés seront définitivement supprimés.",
  },
];

// ───────────────────────────────────────────
// COMPOSANT
// ───────────────────────────────────────────

export function BulkActions({
  permissions,
  selectedIds,
  onSelectionChange,
  onActionComplete,
  totalCount = 0,
}: BulkActionsProps) {
  const { can } = usePermissions(permissions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkActionConfig | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectAllChecked, setSelectAllChecked] = useState<"indeterminate" | boolean>(false);

  // ── Filtre les actions selon les permissions ──
  const availableActions = BULK_ACTIONS.filter((action) =>
    can(action.permission)
  );

  // ── Handlers ──
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectAllChecked(checked);
      if (onSelectionChange) {
        // Si "tout sélectionner", tu passerais tous les IDs
        // Ici simplifié — à adapter selon ta logique de pagination
        onSelectionChange(checked ? [] /* tous les IDs */ : []);
      }
    },
    [onSelectionChange]
  );

  const handleActionClick = useCallback((action: BulkActionConfig) => {
    if (action.requiresConfirmation) {
      setPendingAction(action);
      setIsDialogOpen(true);
    } else {
      executeAction(action);
    }
  }, []);

  const executeAction = useCallback(
    async (action: BulkActionConfig) => {
      if (selectedIds.length === 0) return;

      setIsLoading(true);

      try {
        const response = await fetch(`/api/products/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: action.id,
            ids: selectedIds,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Action échouée");
        }

        // Reset sélection
        if (onSelectionChange) {
          onSelectionChange([]);
        }
        setSelectAllChecked(false);

        // Callback de complétion
        onActionComplete?.();
      } catch (err) {
        console.error("Bulk action failed:", err);
        // Tu peux intégrer un toast ici (sonner, react-hot-toast, etc.)
      } finally {
        setIsLoading(false);
        setIsDialogOpen(false);
        setPendingAction(null);
      }
    },
    [selectedIds, onSelectionChange, onActionComplete]
  );

  const handleConfirm = useCallback(() => {
    if (pendingAction) {
      executeAction(pendingAction);
    }
  }, [pendingAction, executeAction]);

  // ── Renders ──
  if (availableActions.length === 0) {
    return null;
  }

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Checkbox "Sélectionner tout" */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="select-all"
          checked={selectAllChecked}
          onCheckedChange={handleSelectAll}
          aria-label="Sélectionner tout"
        />
        <label
          htmlFor="select-all"
          className="text-sm text-muted-foreground cursor-pointer"
        >
          {hasSelection ? `${selectedIds.length} sélectionné(s)` : "Tout sélectionner"}
        </label>
      </div>

      {/* Badge de compteur */}
      {hasSelection && (
        <Badge variant="secondary" className="font-mono">
          {selectedIds.length}
        </Badge>
      )}

      {/* Dropdown des actions bulk */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasSelection || isLoading}
            className={cn(
              "gap-2",
              !hasSelection && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SelectAll className="h-4 w-4" />
            )}
            Actions groupées
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            disabled
            className="text-xs text-muted-foreground"
          >
            {selectedIds.length} produit(s) sélectionné(s)
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {availableActions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={isLoading}
              className={cn(
                "gap-2 cursor-pointer",
                action.variant === "destructive" &&
                  "text-destructive focus:text-destructive focus:bg-destructive/10"
              )}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmation */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {pendingAction?.confirmationTitle}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.confirmationDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium">
              {selectedIds.length} produit(s) concerné(s)
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                "Confirmer la suppression"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}