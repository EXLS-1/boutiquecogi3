// components/admin/products/product-kpi-cards.tsx
"use client";

import { Package, FileText, Clock, AlertTriangle } from "lucide-react";
import { KpiCard } from "./kpi-card";
import type { ProductKpis } from "@/lib/products/types";

export function ProductKpiCards({ kpis }: { kpis: ProductKpis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <KpiCard title="Total" value={kpis.total} icon={<Package className="w-6 h-6" />} />
      <KpiCard title="Publiés" value={kpis.published} icon={<FileText className="w-6 h-6" />} />
      <KpiCard title="Brouillons" value={kpis.drafts} icon={<Clock className="w-6 h-6" />} />
      <KpiCard title="En révision" value={kpis.pending} icon={<FileText className="w-6 h-6" />} />
      <KpiCard title="Programmés" value={kpis.scheduled} icon={<Clock className="w-6 h-6" />} />
      <KpiCard title="Ruptures" value={kpis.outOfStock} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
    </div>
  );
}
