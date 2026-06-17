// components/dashboard/products/bulk-actions.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { type Permission } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Trash2, Package, Archive, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { bulkProductsAction } from "@/app/dashboard/products/actions";

interface BulkActionsProps {
  permissions: Permission[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onActionComplete: () => void;
  totalCount: number;
  userLevel: number;
}

type BulkActionType = "delete" | "activate" | "deactivate" | "archive";

interface BulkActionConfig {
  id: BulkActionType;
  label: string;
  icon: React.ReactNode;
  permission: string;
  variant?: "default" | "destructive";
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
  maxLevelAllowed?: number; // Protection UI : Le niveau de l'utilisateur doit être INFÉRIEUR ou ÉGAL à cette valeur
}

const BULK_ACTIONS_CONFIG: BulkActionConfig[] = [
  { id: "activate", label: "Activer les produits", icon: <Package className="h-4 w-4" />, permission: "products:update" },
  { id: "deactivate", label: "Passer en brouillon", icon: <Archive className="h-4 w-4" />, permission: "products:update" },
  { id: "archive", label: "Archiver les produits", icon: <Archive className="h-4 w-4" />, permission: "products:bulk_edit" },
  {
    id: "delete",
    label: "Supprimer définitivement",
    icon: <Trash2 className="h-4 w-4" />,
    permission: "products:delete",
    variant: "destructive",
    requiresConfirmation: true,
    maxLevelAllowed: 2, // SÉCURITÉ : Uniquement Level 1 (SUPER_ADMIN) et Level 2 (ADMIN)
    confirmationTitle: "Suppression critique par lots",
    confirmationDescription: "Cette action est irréversible. Les produits sélectionnés seront définitivement purgés.",
  },
];

export function BulkActions({
  permissions,
  selectedIds,
  onActionComplete,
  userLevel,
}: BulkActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filtrage des actions selon les permissions ET le niveau hiérarchique inversé
  const availableActions = useMemo(() => {
    return BULK_ACTIONS_CONFIG.filter((action) => {
      const hasPermission = permissions.includes(action.permission as Permission);
      const isLevelValid = action.maxLevelAllowed ? userLevel <= action.maxLevelAllowed : true;
      return hasPermission && isLevelValid;
    });
  }, [permissions, userLevel]);

  const executeAction = useCallback(async (action: BulkActionConfig) => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);

    try {
      const response = await bulkProductsAction({
        action: action.id,
        ids: selectedIds,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      onActionComplete();
    } catch (err) {
      console.error("[BULK_CLIENT_ERROR]", err);
      alert(err instanceof Error ? err.message : "Une erreur d'habilitation ou de traitement est survenue.");
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
      setPendingAction(null);
    }
  }, [selectedIds, onActionComplete]);

  if (availableActions.length === 0 || selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 animate-in fade-in-50 duration-200">
      <Badge variant="secondary" className="font-mono bg-primary/10 text-primary border-none px-2.5 py-1">
        {selectedIds.length} sélectionné(s)
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading} className="gap-2 border-primary/20">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
            Actions de groupe
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {availableActions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => action.requiresConfirmation ? (setPendingAction(action), setIsDialogOpen(true)) : executeAction(action)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-lg">
              <AlertTriangle className="h-5 w-5" />
              {pendingAction?.confirmationTitle}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {pendingAction?.confirmationDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/5 border border-destructive/10 p-3 rounded-md my-1">
            <p className="text-sm font-medium text-destructive">
              Nombre de lignes impactées : {selectedIds.length} produit(s)
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => pendingAction && executeAction(pendingAction)} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Exécuter la mutation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}