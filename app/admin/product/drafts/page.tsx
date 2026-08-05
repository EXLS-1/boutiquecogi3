import { DraftManager } from "@/components/admin/DraftManager";
import { FileClock } from "lucide-react";

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
          Brouillons & Validation
        </h1>
        <p className="text-slate-500 mt-1">
          Soumettez, approuvez, programmez ou archivez les produits avant leur
          publication en boutique.
        </p>
      </div>

<DraftManager />
    </div>
  );
}
