// app/admin/products/error.tsx
"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function AdminProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Erreur du dashboard produits</h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      </div>
    </div>
  );
}
