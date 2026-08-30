// components/dashboard/product/new-product/dynamic-product-form.tsx

"use client";

import { useState, useCallback } from "react";
import { useCreateProduct } from "@/hooks/use-create-product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface VariantForm {
  sku?: string;
  attributes: Record<string, string>;
  priceOffset: number;
  initialStock: number;
}

const ATTRIBUTE_KEYS = ["couleur", "taille", "matiere", "poids", "dimension"];

export function DynamicProductForm() {
  const { createProduct, isPending, error, data, reset } = useCreateProduct();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [productAttributes, setProductAttributes] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<VariantForm[]>([{ attributes: {}, priceOffset: 0, initialStock: 0 }]);
  const [activeTab, setActiveTab] = useState("simple");

  const addVariant = () => setVariants((p) => [...p, { attributes: {}, priceOffset: 0, initialStock: 0 }]);
  const removeVariant = (i: number) => { if (variants.length > 1) setVariants((p) => p.filter((_, idx) => idx !== i)); };

  const handleSubmit = useCallback(async () => {
    const payload: any = {
      name,
      description: description || undefined,
      categoryId: categoryId || undefined,
      basePrice: parseFloat(basePrice),
      attributes: Object.keys(productAttributes).length > 0 ? productAttributes : undefined,
    };
    if (activeTab === "variable") {
      payload.variants = variants.map((v) => ({
        sku: v.sku || undefined,
        attributes: Object.keys(v.attributes).length > 0 ? v.attributes : undefined,
        priceOffset: v.priceOffset || undefined,
        initialStock: v.initialStock || undefined,
      }));
    }
    const ok = await createProduct(payload);
    if (ok) {
      setName(""); setDescription(""); setCategoryId(""); setBasePrice("");
      setProductAttributes({}); setVariants([{ attributes: {}, priceOffset: 0, initialStock: 0 }]);
      setActiveTab("simple");
    }
  }, [name, description, categoryId, basePrice, productAttributes, variants, activeTab, createProduct]);

  const handleClose = () => { setIsOpen(false); reset(); };
  const ic = "w-full bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button>Nouveau Produit</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ajouter un nouveau produit</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label htmlFor="name">Nom *</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chemise Oxford" className={ic} /></div>
            <div className="col-span-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className={ic} /></div>
            <div><Label htmlFor="categoryId">ID Catategorie</Label><Input id="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={ic} /></div>
            <div><Label htmlFor="basePrice">Prix de base *</Label><Input id="basePrice" type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={ic} /></div>
          </div>
          <AttributeSection attributes={productAttributes} onRemove={(k) => setProductAttributes((p) => { const n = { ...p }; delete n[k]; return n; })} onAdd={(k, v) => setProductAttributes((p) => ({ ...p, [k]: v }))} />
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="simple">Simple</TabsTrigger><TabsTrigger value="variable">A variantes</TabsTrigger></TabsList>
            <TabsContent value="simple" className="mt-4"><p className="text-sm text-muted-foreground">SKU unique genere automatiquement.</p></TabsContent>
            <TabsContent value="variable" className="mt-4 space-y-4">
              {variants.map((v, i) => (
                <VariantCard key={i} variant={v} index={i} setVariants={setVariants} removeVariant={removeVariant} canRemove={variants.length > 1} ic={ic} />
              ))}
              <Button variant="outline" onClick={addVariant} className="w-full">+ Ajouter une variante</Button>
            </TabsContent>
          </Tabs>
          {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
          {data && <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600">Produit cree ! ({data.variantCount} variantes, {data.totalStock} en stock)</div>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isPending || !name || !basePrice}>{isPending ? "Creation..." : "Creer"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function AttributeSection({ attributes, onRemove, onAdd }: { attributes: Record<string, string>; onRemove: (k: string) => void; onAdd: (k: string, v: string) => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Attributs du produit</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(attributes).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2"><Badge variant="secondary">{k}</Badge><span className="text-sm">{v}</span><Button variant="ghost" size="sm" onClick={() => onRemove(k)} className="ml-auto text-destructive">X</Button></div>
        ))}
        <div className="flex items-center gap-2">
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Cle" className="flex-1" />
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valeur" className="flex-1" />
          <Button variant="secondary" onClick={() => { if (key.trim() && value.trim()) { onAdd(key.trim(), value.trim()); setKey(""); setValue(""); } }} disabled={!key.trim() || !value.trim()}>Ajouter</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VariantCard({ variant, index, setVariants, removeVariant, canRemove, ic }: { variant: VariantForm; index: number; setVariants: any; removeVariant: (i: number) => void; canRemove: boolean; ic: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Variante {index + 1}</CardTitle>
        {canRemove && <Button variant="ghost" size="sm" onClick={() => removeVariant(index)} className="text-destructive">Supprimer</Button>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>SKU</Label><Input value={variant.sku || ""} onChange={(e) => setVariants((p: VariantForm[]) => p.map((x, idx) => idx === index ? { ...x, sku: e.target.value } : x))} className={ic} /></div>
          <div><Label>Offset Prix</Label><Input type="number" step="0.01" value={variant.priceOffset} onChange={(e) => setVariants((p: VariantForm[]) => p.map((x, idx) => idx === index ? { ...x, priceOffset: parseFloat(e.target.value) || 0 } : x))} className={ic} /></div>
          <div><Label>Stock</Label><Input type="number" value={variant.initialStock} onChange={(e) => setVariants((p: VariantForm[]) => p.map((x, idx) => idx === index ? { ...x, initialStock: parseInt(e.target.value) || 0 } : x))} className={ic} /></div>
        </div>
        <div className="space-y-2"><Label>Attributs</Label>
          {ATTRIBUTE_KEYS.map((k) => (
            <div key={k} className="flex items-center gap-2"><span className="text-xs w-20 text-muted-foreground">{k}</span><Input value={variant.attributes[k] || ""} onChange={(e) => setVariants((p: VariantForm[]) => p.map((x, idx) => idx === index ? { ...x, attributes: { ...x.attributes, [k]: e.target.value } : x))} className={ic} /></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}