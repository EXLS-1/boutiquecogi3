// app/admin/products/[productId]/page.tsx — Server Component
// =============================================================================
// PRODUIT — Vue détail avec navigation par onglets
// =============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductService } from "@/lib/products/product.service";
import { Package, Tag, LayoutGrid, ShoppingCart, TrendingUp, History, FileText } from "lucide-react";
import { ProductStatusBadge } from "@/components/admin/products/product-status-badge";
import { ProductStockBadge } from "@/components/admin/products/product-stock-badge";
import { TabContent } from "@/components/admin/products/product-detail-tabs";

const TABS = [
  { label: "Vue d'ensemble", value: "overview", icon: "LayoutGrid", href: (id: string) => `/admin/products/${id}` },
  { label: "Variantes", value: "variants", icon: "Package", href: (id: string) => `/admin/products/${id}/variants` },
  { label: "Prix", value: "pricing", icon: "ShoppingCart", href: (id: string) => `/admin/products/${id}/pricing` },
  { label: "Stock", value: "inventory", icon: "ShoppingCart", href: (id: string) => `/admin/products/${id}/inventory` },
  { label: "Médias", value: "media", icon: "Package", href: (id: string) => `/admin/products/${id}/media` },
  { label: "Catalogues", value: "catalogs", icon: "Tag", href: (id: string) => `/admin/products/${id}/catalogs` },
  { label: "Catégories", value: "categories", icon: "LayoutGrid", href: (id: string) => `/admin/products/${id}/categories` },
  { label: "Tags", value: "tags", icon: "Tag", href: (id: string) => `/admin/products/${id}/tags` },
  { label: "SEO", value: "seo", icon: "TrendingUp", href: (id: string) => `/admin/products/${id}/seo` },
  { label: "Historique", value: "history", icon: "History", href: (id: string) => `/admin/products/${id}/history` },
  { label: "Audit", value: "audit", icon: "FileText", href: (id: string) => `/admin/products/${id}/audit` },
] as const;

interface PageProps {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminProductDetailPage({ params, searchParams }: PageProps) {
  const { productId } = await params;
  const sp = await searchParams;
  const product = await ProductService.getDetails(productId);
  if (!product) notFound();
  const activeTab = sp.tab ?? "overview";

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
          <ProductStatusBadge status={product.status} />
          <ProductStockBadge available={product.stock?.available ?? 0} />
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/products/${productId}/edit`} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
            Modifier
          </Link>
          <Link href="/admin/products" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            Retour à la liste
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
        <div><span className="text-slate-500">SKU :</span> <code className="bg-slate-100 px-2 py-1 rounded">{product.sku}</code></div>
        <div><span className="text-slate-500">Type :</span> {product.productType?.type ?? "—"}</div>
        <div><span className="text-slate-500">Statut :</span> {product.status}</div>
        <div><span className="text-slate-500">Actif :</span> {product.isActive ? "Oui" : "Non"}</div>
        <div><span className="text-slate-500">Créé :</span> {new Date(product.createdAt).toLocaleDateString("fr-FR")}</div>
        <div><span className="text-slate-500">Mis à jour :</span> {new Date(product.updatedAt).toLocaleDateString("fr-FR")}</div>
        <div><span className="text-slate-500">Publié :</span> {product.publishedAt ? new Date(product.publishedAt).toLocaleDateString("fr-FR") : "—"}</div>
        <div><span className="text-slate-500">Disponible :</span> <ProductStockBadge available={product.stock?.available ?? 0} /></div>
      </div>

      <nav className="border-b border-slate-200 mb-6">
        <div className="flex flex-wrap gap-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <Link key={tab.value} href={tab.href(productId)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive ? "border-slate-900 text-slate-900" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <TabContent activeTab={activeTab} productId={productId} product={product} />
    </div>
  );
}
