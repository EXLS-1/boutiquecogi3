// components/dashboard/products/product-action-bar.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Upload, Download, ChevronDown } from "lucide-react";
import { createProduct } from "@/components/dashboard/product/actions";
import { toast } from "react-hot-toast";

interface ProductActionBarProps {
  canCreate: boolean;
  canImport: boolean;
  canExport: boolean;
}

export function ProductActionBar({
  canCreate,
  canImport,
  canExport,
}: ProductActionBarProps) {
  const [isCreateProductDialogOpen, setIsCreateProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreating(true);
    const formData = new FormData();
    formData.append("name", newProductName);
    formData.append("price", newProductPrice);

    const result = await createProduct(formData);

    if (result.success) {
      toast.success("Produit créé avec succès !");
      setIsCreateProductDialogOpen(false);
      setNewProductName("");
      setNewProductPrice("");
    } else {
      toast.error(result.error || "Échec de la création du produit.");
      console.error("Product creation failed:", result.details);
    }
    setIsCreating(false);
  };

  return (
    <div className="flex items-center gap-2">
      {(canImport || canExport) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <ChevronDown className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Actions
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions en vrac</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canImport && (
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Upload className="h-4 w-4 opacity-70" />
                Importer des produits
              </DropdownMenuItem>
            )}
            {canExport && (
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Download className="h-4 w-4 opacity-70" />
                Exporter les produits
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {canCreate && (
        <Button size="sm" className="h-8 gap-1" onClick={() => setIsCreateProductDialogOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Ajouter un produit
          </span>
        </Button>
      )}

      <Dialog open={isCreateProductDialogOpen} onOpenChange={setIsCreateProductDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau produit</DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous pour créer un nouveau produit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom
              </Label>
              <Input
                id="name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Prix
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateProductDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Création..." : "Créer le produit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
