"use client";

import { useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Prisma } from "@prisma/client";
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
  Eye,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true } };
    variants: { select: { id: true } };
    _count: { select: { productReviews: true; orderItems: true } };
  };
}>;

interface ProductsTableProps {
  products: ProductWithRelations[];
  total: number;
  page: number;
  limit: number;
  canDelete: boolean;
  canManageVariants: boolean;
  canManageReviews: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

// ───────────────────────────────────────────
// PAGINATION FENETREE (Windowed Pagination)
// ───────────────────────────────────────────

const SIBLING_COUNT = 1;
const BOUNDARY_COUNT = 1;

function generatePaginationItems(current: number, total: number): (number | "ellipsis")[] {
  const totalPageNumbers = SIBLING_COUNT * 2 + 3 + BOUNDARY_COUNT * 2;

  if (total <= totalPageNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(current - SIBLING_COUNT, BOUNDARY_COUNT + 1);
  const rightSiblingIndex = Math.min(current + SIBLING_COUNT, total - BOUNDARY_COUNT);

  const shouldShowLeftEllipsis = leftSiblingIndex > BOUNDARY_COUNT + 1;
  const shouldShowRightEllipsis = rightSiblingIndex < total - BOUNDARY_COUNT;

  const items: (number | "ellipsis")[] = [];

  for (let i = 1; i <= BOUNDARY_COUNT; i++) items.push(i);

  if (shouldShowLeftEllipsis) {
    items.push("ellipsis");
  } else {
    for (let i = BOUNDARY_COUNT + 1; i < leftSiblingIndex; i++) items.push(i);
  }

  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) items.push(i);

  if (shouldShowRightEllipsis) {
    items.push("ellipsis");
  } else {
    for (let i = rightSiblingIndex + 1; i <= total - BOUNDARY_COUNT; i++) items.push(i);
  }

  for (let i = total - BOUNDARY_COUNT + 1; i <= total; i++) items.push(i);

  return items;
}

// ───────────────────────────────────────────
// COMPONENT
// ───────────────────────────────────────────

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

  const productIdsOnPage = products.map((p) => p.id);

  const isAllSelectedOnPage =
    productIdsOnPage.length > 0 &&
    productIdsOnPage.every((id) => selectedIds.includes(id));

  const isSomeSelectedOnPage =
    productIdsOnPage.some((id) => selectedIds.includes(id)) && !isAllSelectedOnPage;

  if (masterCheckboxRef.current) {
    masterCheckboxRef.current.indeterminate = isSomeSelectedOnPage;
  }

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const addedIds = productIdsOnPage.filter((id) => !selectedIds.includes(id));
        onSelectionChange([...selectedIds, ...addedIds]);
      } else {
        onSelectionChange(selectedIds.filter((id) => !productIdsOnPage.includes(id)));
      }
    },
    [productIdsOnPage, selectedIds, onSelectionChange],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, totalPages],
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF" }).format(price);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none font-medium">
            Actif
          </Badge>
        );
      case "ARCHIVED":
        return (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none font-medium">
            Archivé
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 hover:bg-gray-500/20 border-none font-medium">
            Brouillon
          </Badge>
        );
    }
  };

  const paginationItems = generatePaginationItems(page, totalPages);

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
                      "transition-colors hover:bg-muted/40",
                      isSelected && "bg-muted/70",
                    )}
                  >
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
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          {product.id.slice(0, 8)}...
                        </span>
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
                      {product._count?.productReviews ?? 0}
                    </TableCell>

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
                              <DropdownMenuItem className="gap-2 cursor-pointer text-sm text-destructive focus:text-destructive focus:bg-destructive/10 font-medium">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-4 sm:px-6 bg-muted/10">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              Suivant
            </Button>
          </div>

          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> sur{" "}
              <span className="font-semibold text-foreground">{totalPages}</span> ({total} produits)
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(1)}
                disabled={page === 1}
                title="Première page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex gap-1 mx-1">
                {paginationItems.map((item, idx) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === page ? "default" : "outline"}
                      className="h-8 w-8 text-xs p-0 font-mono"
                      onClick={() => handlePageChange(item)}
                    >
                      {item}
                    </Button>
                  ),
                )}
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

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(totalPages)}
                disabled={page === totalPages}
                title="Dernière page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
