// components/admin/products/product-dashboard.tsx
// COMPONENT — Dashboard de synthèse des produits

"use client";

import Link from "next/link";
import { Package, FileText, Clock, AlertTriangle, Grid3X3 } from "lucide-react";
import { KpiCard } from "./kpi-card";
import { ProductStatusBadge } from "./product-status-badge";
import { useProductPermissions } from "@/hooks/admin/products/use-product-permissions";

interface ProductDashboardProps {
  kpis: {
    total: number;
    published: number;
    draft: number;
    pending: number;
    archived: number;
    discontinued: number;
    lowStock: number;
    variantsTotal: number;
  };
  recentProducts: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: Date;
  }>;
}

export function ProductDashboard({ kpis, recentProducts }: ProductDashboardProps) {
  const { has } = useProductPermissions();
  const canCreate = has("products:create");

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Produits"
          value={kpis.total}
          icon={<Package className="w-6 h-6" />}
          trend={{ value: 12, label: "vs mois dernier" }}
        />
        <KpiCard
          title="Publiés"
          value={kpis.published}
          icon={<FileText className="w-6 h-6" />}
          color="green"
        />
        <KpiCard
          title="En attente"
          value={kpis.pending}
          icon={<Clock className="w-6 h-6" />}
          color="amber"
        />
        <KpiCard
          title="En rupture"
          value={kpis.lowStock}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
        />
      </div>

      {/* Statuts */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{kpis.published}</div>
            <div className="text-sm text-green-700">Publiés</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-3xl font-bold text-amber-600">{kpis.pending}</div>
            <div className="text-sm text-amber-700">En attente</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{kpis.draft}</div>
            <div className="text-sm text-blue-700">Brouillons</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-600">{kpis.archived}</div>
            <div className="text-sm text-gray-700">Archivés</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">{kpis.discontinued}</div>
            <div className="text-sm text-red-700">Arrêtés</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{kpis.variantsTotal}</div>
            <div className="text-sm text-purple-700">Variantes</div>
          </div>
        </div>
      </div>

      {/* Produits récents */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Produits récents</h3>
          {canCreate && (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Package className="w-4 h-4" />
              Nouveau produit
            </Link>
          )}
        </div>
        <div className="p-5">
          {recentProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Grid3X3 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>Aucun produit récent</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        Créé le {new Date(product.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <ProductStatusBadge status={product.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}