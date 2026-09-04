// components/product/product-variant.tsx
/**
 * =============================================================================
 * PRODUCT VARIANT — Boutiquecogi3
 * =============================================================================
 * Gestion exhaustive des caractéristiques d'un produit :
 * couleur, taille, dimension, poids, matériau, style, finition.
 * Sélection interactive, validation Zod, store Zustand local, prix dynamique.
 */

"use client";

import { useMemo, useCallback } from "react";
import { create } from "zustand";
import { z } from "zod";
import { Currency } from "@prisma/client";
import { cn } from "@/lib/utils/cn";
import {
  Check,
  Ruler,
  Palette,
  Layers,
  Weight,
  Box,
  AlertCircle
} from "lucide-react";

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const CategorySchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  description: z.string().optional(),
});

export const ColorVariantSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  imageUrl: z.url().optional(),
});

export const SizeSystemEnum = z.enum(["NUMERIC", "ALPHABETIC", "FRACTIONAL"]); // Fractional pour 1/2, 3/4 (chaussures US)

export const SizeVariantSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  sizeSystem: SizeSystemEnum.default("NUMERIC"),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const DimensionSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["cm", "m", "mm", "in", "ft"]).default("cm"),
});

export const WeightSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["g", "kg", "lb", "oz"]).default("g"),
});

export const MaterialSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  description: z.string().optional(),
  ecoFriendly: z.boolean().default(false),
});

export const FinishSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  description: z.string().optional(),
});

export const ProductVariantSchema = z.object({
  id: z.uuid(),
  sku: z.string().min(1),
  priceAdjustment: z.number().default(0),
  stockQuantity: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  color: ColorVariantSchema.optional(),
  size: SizeVariantSchema.optional(),
  dimension: DimensionSchema.optional(),
  weight: WeightSchema.optional(),
  material: MaterialSchema.optional(),
  finish: FinishSchema.optional(),
  barcode: z.string().optional(),
  images: z.array(z.string().url()).default([]),
});

export const ProductVariantConfigSchema = z.object({
  productId: z.uuid(),
  basePrice: z.number().positive(),
  currency: z.enum(Currency).default(Currency.USD),
  variants: z.array(ProductVariantSchema).min(1),
  allowBackorder: z.boolean().default(false),
  maxQuantityPerOrder: z.number().int().positive().default(10),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColorVariant = z.infer<typeof ColorVariantSchema>;
export type SizeVariant = z.infer<typeof SizeVariantSchema>;
export type Dimension = z.infer<typeof DimensionSchema>;
export type Weight = z.infer<typeof WeightSchema>;
export type Material = z.infer<typeof MaterialSchema>;
export type Finish = z.infer<typeof FinishSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductVariantConfig = z.infer<typeof ProductVariantConfigSchema>;

export interface SelectedVariantState {
  variantId: string | null;
  quantity: number;
}

// ─── Store Zustand (local au composant) ───────────────────────────────────────

interface VariantStore {
  selectedVariantId: string | null;
  quantity: number;
  setVariant: (id: string | null) => void;
  setQuantity: (qty: number) => void;
  increment: () => void;
  decrement: (min?: number) => void;
  reset: () => void;
}

export const createVariantStore = (defaultVariantId: string | null) =>
  create<VariantStore>((set, get) => ({
    selectedVariantId: defaultVariantId,
    quantity: 1,
    setVariant: (id) => set({ selectedVariantId: id, quantity: 1 }),
    setQuantity: (qty) => set({ quantity: Math.max(1, qty) }),
    increment: () => {
      const { quantity } = get();
      set({ quantity: quantity + 1 });
    },
    decrement: (min = 1) => {
      const { quantity } = get();
      if (quantity > min) set({ quantity: quantity - 1 });
    },
    reset: () => set({ selectedVariantId: defaultVariantId, quantity: 1 }),
  }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDimension(d: Dimension): string {
  return `${d.length} × ${d.width} × ${d.height} ${d.unit}`;
}

function formatWeight(w: Weight): string {
  return `${w.value} ${w.unit}`;
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

interface ColorSwatchProps {
  color: ColorVariant;
  isSelected: boolean;
  isAvailable: boolean;
  onSelect: () => void;
}

function ColorSwatch({ color, isSelected, isAvailable, onSelect }: ColorSwatchProps) {
  // unique id not needed here
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      aria-label={`Couleur ${color.label}`}
      title={color.label}
      className={cn(
        "group relative h-10 w-10 rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500",
        isSelected
          ? "border-emerald-600 ring-2 ring-emerald-500 ring-offset-2"
          : "border-slate-200 hover:border-slate-400",
        !isAvailable && "opacity-40 cursor-not-allowed grayscale"
      )}
      style={{ backgroundColor: color.hex }}
    >
      {isSelected && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Check
            className={cn(
              "h-4 w-4 drop-shadow-md",
              isLightColor(color.hex) ? "text-slate-900" : "text-white"
            )}
          />
        </span>
      )}
      <span className="sr-only">{color.label}</span>
    </button>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

interface SizeButtonProps {
  size: SizeVariant;
  isSelected: boolean;
  isAvailable: boolean;
  onSelect: () => void;
}

function SizeButton({ size, isSelected, isAvailable, onSelect }: SizeButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      aria-label={`Taille ${size.label}`}
      className={cn(
        "relative px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1",
        isSelected
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50",
        !isAvailable && "opacity-40 cursor-not-allowed line-through bg-slate-100"
      )}
    >
      {size.label}
      {size.description && (
        <span className="block text-xs font-normal opacity-80 mt-0.5">
          {size.description}
        </span>
      )}
    </button>
  );
}

interface QuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (val: number) => void;
  max: number;
  min?: number;
}

function QuantitySelector({
  quantity,
  onIncrement,
  onDecrement,
  onChange,
  max,
  min = 1,
}: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-700">Quantité</span>
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={onDecrement}
          disabled={quantity <= min}
          className="px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Diminuer la quantité"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) onChange(val);
          }}
          className="w-14 text-center text-sm font-semibold text-slate-900 border-x border-slate-200 py-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
          aria-label="Quantité"
        />
        <button
          type="button"
          onClick={onIncrement}
          disabled={quantity >= max}
          className="px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Augmenter la quantité"
        >
          +
        </button>
      </div>
      <span className="text-xs text-slate-400">Max {max}</span>
    </div>
  );
}

interface VariantInfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function VariantInfoRow({ icon, label, value }: VariantInfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
      <div>
        <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </dt>
        <dd className="text-sm font-semibold text-slate-900">{value}</dd>
      </div>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

interface ProductVariantProps {
  config: ProductVariantConfig;
  onVariantChange?: (variant: ProductVariant | null) => void;
  onAddToCart?: (variant: ProductVariant, quantity: number) => void;
  className?: string;
}

export function ProductVariantSelector({
  config,
  onVariantChange,
  onAddToCart,
  className,
}: ProductVariantProps) {
  // Validation runtime
  const validated = useMemo(() => ProductVariantConfigSchema.parse(config), [config]);

  const defaultVariant = useMemo(
    () => validated.variants.find((v) => v.isDefault) ?? validated.variants[0],
    [validated.variants]
  );

  const store = useMemo(
    () => createVariantStore(defaultVariant?.id ?? null),
    [defaultVariant?.id]
  );

  const selectedVariantId = store((s) => s.selectedVariantId);
  const quantity = store((s) => s.quantity);
  const setVariant = store((s) => s.setVariant);
  const setQuantity = store((s) => s.setQuantity);
  const increment = store((s) => s.increment);
  const decrement = store((s) => s.decrement);

  const selectedVariant = useMemo(
    () => validated.variants.find((v) => v.id === selectedVariantId) ?? null,
    [validated.variants, selectedVariantId]
  );

  const finalPrice = useMemo(() => {
    if (!selectedVariant) return validated.basePrice;
    return validated.basePrice + selectedVariant.priceAdjustment;
  }, [validated.basePrice, selectedVariant]);

  const isOutOfStock = useMemo(() => {
    if (!selectedVariant) return true;
    return selectedVariant.stockQuantity === 0 && !validated.allowBackorder;
  }, [selectedVariant, validated.allowBackorder]);

  const handleVariantSelect = useCallback(
    (id: string) => {
      setVariant(id);
      const variant = validated.variants.find((v) => v.id === id) ?? null;
      onVariantChange?.(variant);
    },
    [setVariant, validated.variants, onVariantChange]
  );

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant || isOutOfStock) return;
    onAddToCart?.(selectedVariant, quantity);
  }, [selectedVariant, isOutOfStock, quantity, onAddToCart]);

  // Extraction des options uniques
  const colors = useMemo(
    () =>
      validated.variants
        .map((v) => v.color)
        .filter((c): c is ColorVariant => !!c)
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i),
    [validated.variants]
  );

  const sizes = useMemo(
    () =>
      validated.variants
        .map((v) => v.size)
        .filter((s): s is SizeVariant => !!s)
        .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [validated.variants]
  );

  const materials = useMemo(
    () =>
      validated.variants
        .map((v) => v.material)
        .filter((m): m is Material => !!m)
        .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i),
    [validated.variants]
  );

  const finishes = useMemo(
    () =>
      validated.variants
        .map((v) => v.finish)
        .filter((f): f is Finish => !!f)
        .filter((f, i, arr) => arr.findIndex((x) => x.id === f.id) === i),
    [validated.variants]
  );

  return (
    <div className={cn("space-y-8", className)}>
      {/* ─── Prix ─────────────────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">
          {formatPrice(finalPrice, validated.currency)}
        </span>
        {selectedVariant && selectedVariant.priceAdjustment !== 0 && (
          <span
            className={cn(
              "text-sm font-medium",
              selectedVariant.priceAdjustment > 0 ? "text-red-500" : "text-emerald-600"
            )}
          >
            {selectedVariant.priceAdjustment > 0 ? "+" : ""}
            {formatPrice(selectedVariant.priceAdjustment, validated.currency)}
          </span>
        )}
      </div>

      {/* ─── Référence ────────────────────────────────────────────────────── */}
      {selectedVariant && (
        <div className="text-xs text-slate-500 font-mono">
          SKU : {selectedVariant.sku}
          {selectedVariant.barcode && (
            <span className="ml-3">EAN : {selectedVariant.barcode}</span>
          )}
        </div>
      )}

      {/* ─── Couleurs ─────────────────────────────────────────────────────── */}
      {colors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Couleur
            </span>
            {selectedVariant?.color && (
              <span className="text-sm text-slate-500">{selectedVariant.color.label}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Sélection de couleur">
            {colors.map((color) => {
              const isSelected = selectedVariant?.color?.id === color.id;
              const isAvailable = validated.variants.some(
                (v) => v.color?.id === color.id && v.stockQuantity > 0
              );
              return (
                <ColorSwatch
                  key={color.id}
                  color={color}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  onSelect={() => {
                    const target = validated.variants.find(
                      (v) => v.color?.id === color.id && (isSelected || v.stockQuantity > 0)
                    );
                    if (target) handleVariantSelect(target.id);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Tailles ──────────────────────────────────────────────────────── */}
      {sizes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Taille
            </span>
            {selectedVariant?.size && (
              <span className="text-sm text-slate-500">{selectedVariant.size.label}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sélection de taille">
            {sizes.map((size) => {
              const isSelected = selectedVariant?.size?.id === size.id;
              const isAvailable = validated.variants.some(
                (v) => v.size?.id === size.id && v.stockQuantity > 0
              );
              return (
                <SizeButton
                  key={size.id}
                  size={size}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  onSelect={() => {
                    const target = validated.variants.find(
                      (v) => v.size?.id === size.id && (isSelected || v.stockQuantity > 0)
                    );
                    if (target) handleVariantSelect(target.id);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Matériaux ────────────────────────────────────────────────────── */}
      {materials.length > 0 && (
        <div className="space-y-3">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Matériau
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {materials.map((material) => {
              const isSelected = selectedVariant?.material?.id === material.id;
              const isAvailable = validated.variants.some(
                (v) => v.material?.id === material.id && v.stockQuantity > 0
              );
              return (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => {
                    const target = validated.variants.find(
                      (v) => v.material?.id === material.id && (isSelected || v.stockQuantity > 0)
                    );
                    if (target) handleVariantSelect(target.id);
                  }}
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  className={cn(
                    "text-left px-4 py-3 rounded-lg border text-sm transition-all",
                    isSelected
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700",
                    !isAvailable && "opacity-40 cursor-not-allowed grayscale"
                  )}
                >
                  <div className="font-medium flex items-center gap-2">
                    {material.label}
                    {material.ecoFriendly && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
                        Eco
                      </span>
                    )}
                  </div>
                  {material.description && (
                    <div className="text-xs text-slate-500 mt-1">{material.description}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Finitions ────────────────────────────────────────────────────── */}
      {finishes.length > 0 && (
        <div className="space-y-3">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Box className="h-4 w-4" />
            Finition
          </span>
          <div className="flex flex-wrap gap-2">
            {finishes.map((finish) => {
              const isSelected = selectedVariant?.finish?.id === finish.id;
              const isAvailable = validated.variants.some(
                (v) => v.finish?.id === finish.id && v.stockQuantity > 0
              );
              return (
                <button
                  key={finish.id}
                  type="button"
                  onClick={() => {
                    const target = validated.variants.find(
                      (v) => v.finish?.id === finish.id && (isSelected || v.stockQuantity > 0)
                    );
                    if (target) handleVariantSelect(target.id);
                  }}
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-all",
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-400",
                    !isAvailable && "opacity-40 cursor-not-allowed line-through"
                  )}
                >
                  {finish.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Détails de la variante sélectionnée ─────────────────────────── */}
      {selectedVariant && (
        <dl className="border-t border-slate-100 pt-6 space-y-1">
          {selectedVariant.dimension && (
            <VariantInfoRow
              icon={<Ruler className="h-4 w-4" />}
              label="Dimensions"
              value={formatDimension(selectedVariant.dimension)}
            />
          )}
          {selectedVariant.weight && (
            <VariantInfoRow
              icon={<Weight className="h-4 w-4" />}
              label="Poids"
              value={formatWeight(selectedVariant.weight)}
            />
          )}
          <VariantInfoRow
            icon={<Box className="h-4 w-4" />}
            label="Stock"
            value={
              selectedVariant.stockQuantity > 0
                ? `${selectedVariant.stockQuantity} unité${selectedVariant.stockQuantity > 1 ? "s" : ""} disponible${selectedVariant.stockQuantity > 1 ? "s" : ""}`
                : validated.allowBackorder
                  ? "En rupture — Précommande possible"
                  : "Rupture de stock"
            }
          />
        </dl>
      )}

      {/* ─── Quantité + CTA ───────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <QuantitySelector
          quantity={quantity}
          onIncrement={increment}
          onDecrement={() => decrement(1)}
          onChange={(val) => setQuantity(Math.min(val, validated.maxQuantityPerOrder))}
          max={validated.maxQuantityPerOrder}
          min={1}
        />

        {isOutOfStock && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {validated.allowBackorder
                ? "Produit en rupture — Précommande activée"
                : "Cette variante est actuellement indisponible."}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={cn(
            "w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
            isOutOfStock
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
          )}
        >
          {isOutOfStock
            ? validated.allowBackorder
              ? "Précommander"
              : "Indisponible"
            : `Ajouter au panier — ${formatPrice(finalPrice * quantity, validated.currency)}`}
        </button>
      </div>
    </div>
  );
}

// ─── Exports additionnels ───────────────────────────────────────────────────

export { formatDimension, formatWeight, isLightColor };
export type { VariantStore };