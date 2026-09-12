// app/admin/products/page.tsx — Server Component
// =============================================================================
// DASHBOARD PRODUITS — Vue opérationnelle (KPIs + filtres + liste paginée)
// =============================================================================

import Link from "next/link";
import { Package, Plus, FileClock, Archive, BarChart3 } from "lucide-react";
import { getProductKpis, getProductList } from "@/lib/products/product.repository";
import { ProductKpiCards } from "@/components/admin/products/product-kpi-cards";
import { ProductFilters } from "@/components/admin/products/product-filters";
import { ProductTable } from "@/components/admin/products/product-table";
import { KpiCard } from "@/components/admin/products/kpi-card";

export const metadata = {
  title: "Produits | Administration",
  description: "Gestion complète du catalogue produit : création, prix, stock, publication.",
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    productType?: string;
    categoryId?: string;
    stockState?: string;
    featured?: string;
    cursor?: string;
    limit?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const limit = Math.min(Number(sp.limit ?? 25), 100);

  const [kpis, listResult] = await Promise.all([
    getProductKpis(),
    getProductList({
      search: sp.search,
      status: sp.status ? [sp.status as any] : undefined,
      productType: sp.productType,
      categoryId: sp.categoryId,
      stockState: sp.stockState as any,
      featured: sp.featured === "true" ? true : undefined,
      limit,
      cursor: sp.cursor,
    }),
  ]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-slate-700" />
            Produits
          </h1>
          <p className="text-slate-500 mt-1">
            Gérez votre catalogue, prix, stock et publication.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau produit
        </Link>
      </div>

      {/* KPIs */}
      <ProductKpiCards kpis={kpis} />

      {/* Navigation rapide */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
        <Link href="/admin/products" className="text-sm font-medium text-slate-900 border-b-2 border-slate-900 pb-2">
          Tous les produits
        </Link>
        <Link href="/admin/products/drafts" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          <FileClock className="w-4 h-4 inline mr-1" />
          Brouillons &amp; workflow
        </Link>
        <Link href="/admin/products/inventory" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          <BarChart3 className="w-4 h-4 inline mr-1" />
          Stock &amp; inventaire
        </Link>
      </div>

      {/* Filtres */}
      <ProductFilters current={sp} />

      {/* Table */}
      <ProductTable result={listResult} />
    </div>
  );
}
