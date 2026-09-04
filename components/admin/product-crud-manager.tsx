"use client";

// components/admin/product-crud-manager.tsx
// =============================================================================
// ProductCrudManager — CRUD Produits complet (produits + variants)
// =============================================================================
// Consomme les server actions de server/actions/product-draft-actions.ts :
//   - Création d'un brouillon avec variants (transaction atomique)
//   - Édition inline (nom, prix, description)
//   - Ajout / édition / suppression de variants
//   - Duplication et suppression douce d'un produit
// RBAC géré côté serveur ; les erreurs (AUTH_REQUIRED, CONFLICT…) sont
// affichées à l'utilisateur.
// =============================================================================

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, PackagePlus, Pencil, Trash2, Copy, Plus, RefreshCw } from "lucide-react";
import type { Currency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createDraftProductAction,
  listDraftProductsAction,
  updateDraftProductAction,
  deleteDraftProductAction,
  duplicateDraftProductAction,
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
  type DraftActionResult,
} from "@/server/actions/product-draft-actions";

// ─── Types (miroir de la sérialisation serveur) ───

type SerializedVariant = {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  priceOffset: number;
  createdAt: string;
};

type SerializedProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  basePrice: number;
  price: number;
  currency: Currency;
  isActive: boolean;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: string[];
  category: { id: string; name: string; slug: string } | null;
  variantCount: number;
  variants: SerializedVariant[];
};

type VariantFormRow = { key: string; name: string; value: string; sku: string; priceOffset: string };

function formatError(res: DraftActionResult<unknown>): string {
  if (res.success) return "";
  if (res.fieldErrors) {
    const first = Object.values(res.fieldErrors)[0]?.[0];
    if (first) return first;
  }
  return res.error;
}

export function ProductCrudManager() {
  const [products, setProducts] = useState<SerializedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Formulaire de création
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVariants, setNewVariants] = useState<VariantFormRow[]>([]);

  // Édition produit
  const [editing, setEditing] = useState<SerializedProduct | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const loadProducts = useCallback(async () => {
    const res = await listDraftProductsAction({});
    if (res.success) {
      setProducts(res.data.products);
    } else {
      setError(formatError(res));
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await loadProducts();
    setIsLoading(false);
  }, [loadProducts]);

  useEffect(() => {
    // Chargement initial : isLoading étant déjà true au montage, on fait
    // uniquement le fetch et on bascule isLoading via une fonction async où
    // les setState ont lieu après l'await (pas de setState synchrone).
    let active = true;
    async function load() {
      const res = await listDraftProductsAction({});
      if (!active) return;
      if (res.success) {
        setProducts(res.data.products);
      } else {
        setError(formatError(res));
      }
      setIsLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  function runAction(fn: () => Promise<DraftActionResult<unknown>>) {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        setMessage(res.message ?? "Opération réussie");
        setError(null);
        await refresh();
      } else {
        setError(formatError(res));
      }
    });
  }

  // ─── CREATE ───
  function handleCreate() {
    const variants = newVariants
      .filter((v) => v.name.trim() && v.value.trim())
      .map((v) => ({
        sku: v.sku.trim() || undefined,
        attributes: { [v.name.trim()]: v.value.trim() },
        priceOffset: Number(v.priceOffset) || 0,
      }));
    runAction(async () =>
      createDraftProductAction({
        name: newName,
        basePrice: Number(newPrice) || 0,
        description: newDescription || null,
        variants,
      }),
    );
    setShowCreate(false);
    setNewName("");
    setNewPrice("");
    setNewDescription("");
    setNewVariants([]);
  }

  // ─── UPDATE ───
  function handleSaveEdit() {
    if (!editing) return;
    const input: Record<string, unknown> = {};
    if (editName !== editing.name) input.name = editName;
    if (Number(editPrice) !== editing.basePrice) input.basePrice = Number(editPrice) || 0;
    if (editDescription !== (editing as { description?: string }).description)
      input.description = editDescription || null;
    if (Object.keys(input).length === 0) {
      setEditing(null);
      return;
    }
    runAction(async () => updateDraftProductAction(editing.id, input));
    setEditing(null);
  }

  function openEdit(p: SerializedProduct) {
    setEditing(p);
    setEditName(p.name);
    setEditPrice(String(p.basePrice));
    setEditDescription("");
  }
  // ─── DELETE / DUPLICATE ───
  function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer définitivement le brouillon "${name}" ?`)) return;
    runAction(async () => deleteDraftProductAction(id));
  }

  function handleDuplicate(id: string) {
    runAction(async () => duplicateDraftProductAction(id));
  }

  // ─── VARIANTS ───
  function handleAddVariant(productId: string) {
    runAction(async () =>
      createVariantAction({
        productId,
        attributes: { "Attribut 1": "Valeur 1" },
        priceOffset: 0,
      }),
    );
  }

  function handleUpdateVariant(variant: SerializedVariant, sku: string, offset: number) {
    runAction(async () =>
      updateVariantAction(variant.id, {
        sku: sku.trim() || undefined,
        attributes: variant.attributes,
        priceOffset: Number.isFinite(offset) ? offset : 0,
      }),
    );
  }

  function handleDeleteVariant(variant: SerializedVariant) {
    if (!confirm(`Supprimer la variante "${variant.sku}" ?`)) return;
    runAction(async () => deleteVariantAction(variant.id));
  }

  // ─── RENDER ───
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-amber-500" />
          CRUD Produits &amp; Variants
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setShowCreate((s) => !s)}>
            <Plus className="h-3 w-3 mr-1" />
            Nouveau produit
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Formulaire de création */}
      {showCreate && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nom du produit *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex : T-shirt Premium" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Prix de base *</label>
              <Input type="number" min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Description</label>
            <Textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium">Variants (attributs, SKU, écart de prix)</p>
            {newVariants.map((row) => (
              <div key={row.key} className="grid grid-cols-[1fr_1fr_1fr_100px_auto] gap-2 items-center">
                <Input placeholder="Attribut (ex: taille)" value={row.name}
                  onChange={(e) => setNewVariants((vs) => vs.map((v) => v.key === row.key ? { ...v, name: e.target.value } : v))} />
                <Input placeholder="Valeur (ex: XL)" value={row.value}
                  onChange={(e) => setNewVariants((vs) => vs.map((v) => v.key === row.key ? { ...v, value: e.target.value } : v))} />
                <Input placeholder="SKU (auto)" value={row.sku}
                  onChange={(e) => setNewVariants((vs) => vs.map((v) => v.key === row.key ? { ...v, sku: e.target.value } : v))} />
                <Input type="number" placeholder="+prix" value={row.priceOffset}
                  onChange={(e) => setNewVariants((vs) => vs.map((v) => v.key === row.key ? { ...v, priceOffset: e.target.value } : v))} />
                <Button variant="ghost" size="icon" onClick={() => setNewVariants((vs) => vs.filter((v) => v.key !== row.key))}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => setNewVariants((vs) => [...vs, { key: crypto.randomUUID(), name: "", value: "", sku: "", priceOffset: "0" }])}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter un variant
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button size="sm" disabled={newName.trim().length < 2 || isPending} onClick={handleCreate}>
              {isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PackagePlus className="h-3 w-3 mr-1" />}
              Créer le brouillon
            </Button>
          </div>
        </div>
      )}
      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Chargement…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          Aucun brouillon. Créez votre premier produit ci-dessus.
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU : {p.sku} · {p.basePrice.toFixed(2)} {p.currency}
                    {p.category ? ` · ${p.category.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{p.status}</Badge>
                  <Badge variant="outline">{p.variantCount} variante(s)</Badge>
                </div>
              </div>

              {/* Variants existants */}
              {p.variants.length > 0 && (
                <div className="space-y-1">
                  {p.variants.map((v) => (
                    <VariantRow
                      key={v.id}
                      variant={v}
                      disabled={isPending}
                      onSave={handleUpdateVariant}
                      onDelete={handleDeleteVariant}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(p)} disabled={isPending}>
                  <Pencil className="h-3 w-3 mr-1" /> Modifier
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAddVariant(p.id)} disabled={isPending}>
                  <Plus className="h-3 w-3 mr-1" /> Ajouter un variant
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDuplicate(p.id)} disabled={isPending}>
                  <Copy className="h-3 w-3 mr-1" /> Dupliquer
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id, p.name)} disabled={isPending}>
                  <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogue d'édition produit */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg bg-card p-6">
            <h3 className="font-semibold">Modifier « {editing.name} »</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium">Nom</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Prix de base</label>
              <Input type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Annuler</Button>
              <Button size="sm" disabled={isPending} onClick={handleSaveEdit}>
                {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ligne de variante (SKU + écart de prix éditables) ───

function VariantRow({
  variant,
  disabled,
  onSave,
  onDelete,
}: {
  variant: SerializedVariant;
  disabled: boolean;
  onSave: (variant: SerializedVariant, sku: string, offset: number) => void;
  onDelete: (variant: SerializedVariant) => void;
}) {
  const [sku, setSku] = useState(variant.sku);
  const [offset, setOffset] = useState(String(variant.priceOffset));
  const attrs = Object.entries(variant.attributes)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");

  const dirty = sku !== variant.sku || Number(offset) !== variant.priceOffset;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant="outline" className="max-w-[220px] truncate">{attrs || "—"}</Badge>
      <Input className="h-8 w-40" value={sku} onChange={(e) => setSku(e.target.value)} disabled={disabled} />
      <Input
        className="h-8 w-24"
        type="number"
        value={offset}
        onChange={(e) => setOffset(e.target.value)}
        disabled={disabled}
        placeholder="+prix"
      />
      {dirty && (
        <Button size="sm" variant="outline" className="h-8" disabled={disabled}
          onClick={() => onSave(variant, sku, Number(offset))}>
          OK
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-8" disabled={disabled} onClick={() => onDelete(variant)}>
        <Trash2 className="h-3 w-3 text-red-500" />
      </Button>
    </div>
  );
}


