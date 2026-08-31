import { DraftManager } from "@/components/admin/DraftManager";
import { ProductCrudManager } from "@/components/admin/product-crud-manager";
import { FileClock, PackagePlus } from "lucide-react";

export const metadata = {
  title: "Brouillons & Validation | Boutique COGI",
  description:
    "Gérez le workflow de publication des produits : brouillons, en attente, programmés.",
};

export default function AdminDraftsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileClock className="w-6 h-6 text-slate-700" />
          Brouillons &amp; Validation
        </h1>
        <p className="text-slate-500 mt-1">
          Soumettez, approuvez, programmez ou archivez les produits avant leur
          publication en boutique.
        </p>
      </div>

      {/* CRUD complet (produits + variants) */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <PackagePlus className="w-5 h-5 text-amber-500" />
          Traitement complet des produits et de leurs variants
        </h2>
        <ProductCrudManager />
      </div>

      {/* Workflow de publication */}
<DraftManager />
    </div>
  );
}
