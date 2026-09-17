"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCatalog } from "@/store/use-catalog-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductDetailPrice, ProductAvailability } from "./product-detail-summary";
import { getProductHref, type ProductQuickViewData } from "@/lib/product-catalog/product-quick-view";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; product: ProductQuickViewData };

function QuickViewDetails({ id, close }: { id: string; close: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(id)}/quick-view`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(response.status === 404
            ? "Produit introuvable ou indisponible"
            : "Impossible de charger ce produit. Veuillez réessayer.");
        }
        const product: ProductQuickViewData = await response.json();
        if (!controller.signal.aborted) setState({ status: "ready", product });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Impossible de charger ce produit" });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [id, attempt]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{state.status === "ready" ? state.product.name : "Aperçu rapide"}</DialogTitle>
        <DialogDescription>Consultez le produit sans quitter votre sélection.</DialogDescription>
      </DialogHeader>
      {state.status === "loading" && <p role="status" className="py-12 text-center">Chargement du produit…</p>}
      {state.status === "error" && (
        <div className="space-y-4">
          <p role="alert">{state.message}</p>
          <Button type="button" onClick={() => {
            setState({ status: "loading" });
            setAttempt((value) => value + 1);
          }}>Réessayer</Button>
        </div>
      )}
      {state.status === "ready" && (
        <div className="grid gap-6 sm:grid-cols-2">
          <QuickViewImage product={state.product} />
          <div className="flex flex-col gap-4">
            <ProductDetailPrice product={state.product} />
            <ProductAvailability product={state.product} />
            {state.product.description && <p className="whitespace-pre-line text-sm text-muted-foreground line-clamp-6">{state.product.description}</p>}
            <Button asChild className="mt-auto">
              <Link href={getProductHref(state.product)} onClick={close}>Voir la fiche complète</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function QuickViewImage({ product }: { product: ProductQuickViewData }) {
  const [failed, setFailed] = useState(false);
  const image = product.productImages[0]?.url || product.images[0];
  return (
    <div className="aspect-square overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
      {image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={product.productImages[0]?.alt || product.name} className="h-full w-full object-contain" onError={() => setFailed(true)} />
      ) : <span className="text-sm text-slate-500">Aucune image disponible</span>}
    </div>
  );
}

/** Un seul dialogue, même si un produit figure dans plusieurs listes. */
export function ProductQuickView() {
  const id = useCatalog((state) => state.quickViewProductId);
  const setQuickViewProduct = useCatalog((state) => state.setQuickViewProduct);
  const pathname = usePathname();
  const trigger = useRef<HTMLElement | null>(null);
  const close = () => setQuickViewProduct(null);

  useEffect(() => {
    // Fermer aussi lors d'une navigation externe au lien du dialogue.
    return () => useCatalog.getState().setQuickViewProduct(null);
  }, [pathname]);

  return (
    <Dialog open={id !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"
        onOpenAutoFocus={() => {
          trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (trigger.current?.isConnected) trigger.current.focus();
        }}
      >
        {id !== null && <QuickViewDetails key={id} id={id} close={close} />}
      </DialogContent>
    </Dialog>
  );
}
