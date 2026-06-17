"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Layers, 
  MessageSquare, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Eye 
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Interface stricte alignée sur vos requêtes Prisma et vos filtres
interface Product {
  id: string;
  name: string;
  price: number;
  status: string; // "ACTIVE" | "DRAFT" | "ARCHIVED"
  category?: { id: string; name: string } | null;
  variants?: { id: string }[];
  _count?: { reviews: number; orderItems: number } | null;
  createdAt: any;
}

interface ProductsTableProps {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  canDelete: boolean;
  canManageVariants: boolean;
  canManageReviews: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ProductsTable({
  products,
  total,
  page,
  limit,
  canDelete,
  canManageVariants,
  canManageReviews,
  selectedIds,
  onSelectionChange,
}: ProductsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(total / limit);

  // 1. Liste des IDs uniques présents uniquement sur la page en cours
  const productIdsOnPage = useMemo(() => products.map((p) => p.id), [products]);
  
  // Détermine si TOUS les produits de la page active sont sélectionnés
  const isAllSelectedOnPage = useMemo(() => {
    if (productIdsOnPage.length === 0) return false;
    return productIdsOnPage.every((id) => selectedIds.includes(id));
  }, [productIdsOnPage, selectedIds]);

  // Détermine si une PARTIE seulement des produits de la page est sélectionnée
  const isSomeSelectedOnPage = useMemo(() => {
    return productIdsOnPage.some((id) => selectedIds.includes(id)) && !isAllSelectedOnPage;
  }, [productIdsOnPage, selectedIds, isAllSelectedOnPage]);

  // Synchronisation de l'état indéterminé de l'input natif de l'en-tête
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeSelectedOnPage;
    }
  }, [isSomeSelectedOnPage]);

  // 2. Gestionnaire de la checkbox maître (Toggle All sur la page active)
  const handleToggleAll = useCallback((checked: boolean) => {
    if (checked) {
      // Ajoute à la sélection globale les IDs manquants de la page courante
      const addedIds = productIdsOnPage.filter((id) => !selectedIds.includes(id));
      onSelectionChange([...selectedIds, ...addedIds]);
    } else {
      // Retire de la sélection globale uniquement les IDs de la page courante
      onSelectionChange(selectedIds.filter((id) => !productIdsOnPage.includes(id)));
    }
  }, [productIdsOnPage, selectedIds, onSelectionChange]);

  // 3. Routage dynamique de la pagination via l'URL (Next.js Server-Side Sync)
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, totalPages]);

  // Formatteur monétaire USD standardisé
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none font-medium">Actif</Badge>;
      case "ARCHIVED":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-none font-medium">Archivé</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-none font-medium">Brouillon</Badge>;
    }
  };

  return (
    <div className="rounded-md border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[50px] text-center">
                <input
                  type="checkbox"
                  ref={masterCheckboxRef}
                  checked={isAllSelectedOnPage}
                  onChange={(e) => handleToggleAll(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                />
              </TableHead>
              <TableHead className="font-semibold text-foreground">Produit</TableHead>
              <TableHead className="font-semibold text-foreground">Catégorie</TableHead>
              <TableHead className="font-semibold text-foreground">Statut</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Prix</TableHead>
              <TableHead className="font-semibold text-foreground text-center">Variantes</TableHead>
              <TableHead className="font-semibold text-foreground text-center">Avis</TableHead>
              <TableHead className="w-[80px] text-center font-semibold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Aucun produit ne correspond aux critères de recherche.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <TableRow 
                    key={product.id} 
                    className={cn(
                      "transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted/70",
                      isSelected && "bg-muted"
                    )}
                    data-state={isSelected ? "selected" : "unselected"}
                  >
                    {/* Logique d'intégration exacte de votre case à cocher unitaire */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSelectionChange([...selectedIds, product.id]);
                          } else {
                            onSelectionChange(selectedIds.filter((id) => id !== product.id));
                          }
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                      />
                    </TableCell>
                    
                    <TableCell className="font-medium max-w-[260px] truncate">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{product.name}</span>
                        <span className="text-xs text-muted-foreground font-mono truncate">{product.id}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-muted-foreground text-sm">
                      {product.category?.name || "—"}
                    </TableCell>
                    
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    
                    <TableCell className="text-right font-mono font-semibold text-sm">
                      {formatPrice(product.price)}
                    </TableCell>
                    
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {product.variants?.length ?? 0}
                    </TableCell>
                    
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {product._count?.reviews ?? 0}
                    </TableCell>
                    
                    {/* Menu d'actions contextuel régi par les permissions injectées */}
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" title="Actions unitaires">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Options</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer text-sm">
                            <Eye className="h-4 w-4 opacity-70" /> Voir la fiche
                          </DropdownMenuItem>
                          
                          {canManageVariants && (
                            <DropdownMenuItem className="gap-2 cursor-pointer text-sm">
                              <Layers className="h-4 w-4 opacity-70" /> Modifier variantes
                            </DropdownMenuItem>
                          )}
                          
                          {canManageReviews && (
                            <DropdownMenuItem className="gap-2 cursor-pointer text-sm">
                              <MessageSquare className="h-4 w-4 opacity-70" /> Modérer les avis
                            </DropdownMenuItem>
                          )}
                          
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="gap-2 cursor-pointer text-sm text-destructive focus:text-destructive focus:bg-destructive/10 font-medium"
                                onClick={() => {
                                  // Permet d'appeler l'action unitaire de suppression ici si nécessaire
                                }}
                              >
                                <Trash2 className="h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination unifiée */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-4 sm:px-6 bg-muted/10">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
              Suivant
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page}</span> sur{" "}
                <span className="font-semibold text-foreground">{totalPages}</span> ({total} produits)
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    className="h-8 w-8 text-xs p-0 font-mono"
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}