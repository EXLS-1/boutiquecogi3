// app/admin/products/drafts/page.tsx
import { DraftManager } from "@/components/admin/DraftManager";

export const metadata = {
  title: "Brouillons & Validation | Administration Produits",
  description: "Soumettez, approuvez, programmez ou archivez les produits.",
};

export default function AdminProductDraftsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Brouillons &amp; Validation</h1>
      <DraftManager />
    </div>
  );
}
