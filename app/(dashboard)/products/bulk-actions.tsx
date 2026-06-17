// /app/(dashboard)/products/BulkActions.tsx
"use client";

import { useState, useCallback } from "react";
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
  CheckSquare,
  Trash2,
  Package,
  Tag,
  Archive,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { bulkProductsAction } from "./actions"; // Importation directe de la Server Action

interface BulkActionsProps {
  permissions: Permission[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onActionComplete: () => void;
  totalCount: number;
}

type BulkActionType = "delete" | "activate" | "deactivate" | "archive";

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

const BULK_ACTIONS: BulkActionConfig[] = [
  { id: "activate", label: "Activer", icon: <Package className="h-4 w-4" />, permission: PERMISSIONS.PRODUCTS_UPDATE },
  { id: "deactivate", label: "Désactiver", icon: <Archive className="h-4 w-4" />, permission: PERMISSIONS.PRODUCTS_UPDATE },
  { id: "archive", label: "Archiver", icon: <Archive className="h-4 w-4" />, permission: PERMISSIONS.PRODUCTS_BULK_EDIT },
  {
    id: "delete",
    label: "Supprimer",
    icon: <Trash2 className="h-4 w-4" />,
    permission: PERMISSIONS.PRODUCTS_DELETE,
    variant: "destructive",
    requiresConfirmation: true,
    confirmationTitle: "Supprimer les produits sélectionnés",
    confirmationDescription: "Cette action est irréversible. Les produits sélectionnés seront définitivement supprimés.",
  },
];

export function BulkActions({
  permissions,
  selectedIds,
  onSelectionChange,
  onActionComplete,
  totalCount,
}: BulkActionsProps) {
  const can = (permission: Permission) => permissions.includes(permission);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const availableActions = BULK_ACTIONS.filter((action) => can(action.permission));
  const hasSelection = selectedIds.length > 0;
  const isAllSelected = hasSelection && selectedIds.length === totalCount;

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        onSelectionChange([]);
      }
      // La logique exacte de remplissage de tous les IDs dépend de la structure de votre ProductTable
    },
    [onSelectionChange]
  );

  const executeAction = useCallback(
    async (action: BulkActionConfig) => {
      if (selectedIds.length === 0) return;
      setIsLoading(true);

      try {
        // Exécution native de la Server Action au lieu du Fetch REST API
        const response = await bulkProductsAction({
          action: action.id,
          ids: selectedIds,
        });

        if (!response.success) {
          throw new Error(response.error);
        }

        onActionComplete();
      } catch (err) {
        console.error("Bulk action failed:", err);
        // Intégrer votre système de Toast d'erreur ici (ex: toast.error(...))
      } finally {
        setIsLoading(false);
        setIsDialogOpen(false);
        setPendingAction(null);
      }
    },
    [selectedIds, onActionComplete]
  );

  const handleActionClick = useCallback((action: BulkActionConfig) => {
    if (action.requiresConfirmation) {
      setPendingAction(action);
      setIsDialogOpen(true);
    } else {
      executeAction(action);
    }
  }, [executeAction]);

  if (availableActions.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Compteur et statut */}
      {hasSelection && (
        <Badge variant="secondary" className="font-mono px-2.5 py-1 text-xs">
          {selectedIds.length} sélectionné(s)
        </Badge>
      )}

      {/* Trigger du menu d'actions groupées */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!hasSelection || isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
            Actions groupées
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {availableActions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={isLoading}
              className={cn(
                "gap-2 cursor-pointer",
                action.variant === "destructive" && "text-destructive focus:text-destructive focus:bg-destructive/10"
              )}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog sécurisé */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {pendingAction?.confirmationTitle}
            </DialogTitle>
            <DialogDescription>{pendingAction?.confirmationDescription}</DialogDescription>
          </DialogHeader>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium text-muted-foreground">
              Nombre de produits impactés : <span className="font-bold text-foreground">{selectedIds.length}</span>
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => pendingAction && executeAction(pendingAction)} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}