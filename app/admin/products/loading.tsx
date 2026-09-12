// app/admin/products/loading.tsx
import { Loader2 } from "lucide-react";

export default function AdminProductsLoading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-96 bg-slate-200 rounded" />
        <div className="grid grid-cols-5 gap-4 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
