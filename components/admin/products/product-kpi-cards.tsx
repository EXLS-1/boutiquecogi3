// components/admin/products/product-kpi-cards.tsx
import { Package, FileText, Clock, Archive, AlertTriangle } from "lucide-react";
import { KpiCard } from "./kpi-card";
import type { ProductKpis } from "@/lib/products/types";

export function ProductKpiCards({ kpis }: { kpis: ProductKpis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <KpiCard title="Total" value={kpis.total} icon={Package} />
      <KpiCard title="Publiés" value={kpis.published} icon={FileText} trend="up" />
      <KpiCard title="Brouillons" value={kpis.drafts} icon={Clock} />
      <KpiCard title="En révision" value={kpis.pending} icon={FileText} />
      <KpiCard title="Programmés" value={kpis.scheduled} icon={Clock} />
      <KpiCard title="Ruptures" value={kpis.outOfStock} icon={AlertTriangle} trend="down" />
    </div>
  );
}
