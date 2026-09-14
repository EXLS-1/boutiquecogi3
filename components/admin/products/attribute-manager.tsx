// components/admin/products/attribute-manager.tsx
// COMPONENT — Gestion des attributs & options (portail admin produits)
// =============================================================================
// Affiche les attributs produits et les configurations de variantes, avec les
// valeurs rattachées (relation `values` de ProductAttribute).
// =============================================================================

"use client";

import { ListChecks, Plus, Settings2 } from "lucide-react";

type AttributeItem = {
  id: string;
  name: string;
  type: string;
  values?: Array<{ id: string; value: string; productId?: string }>;
};

type VariantConfigItem = {
  id: string;
  attribute: string;
  label: string;
  type: string;
  isRequired: boolean;
  minRoleLevel: number;
};

type AttributeManagerProps = {
  attributes: AttributeItem[];
  variantConfigs: VariantConfigItem[];
};

export function AttributeManager({
  attributes,
  variantConfigs,
}: AttributeManagerProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="h-5 w-5 text-slate-400" />
          Attributs produits
        </h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouvel attribut
        </button>
      </div>

      {attributes.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun attribut.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {attributes.map((attribute) => (
            <div
              key={attribute.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-slate-800">
                  {attribute.name}
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {attribute.type}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(attribute.values ?? []).length === 0 ? (
                  <span className="text-xs text-slate-400">Aucune valeur</span>
                ) : (
                  attribute.values!.map((value) => (
                    <span
                      key={value.id}
                      className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
                    >
                      {value.value}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-200 pt-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Settings2 className="h-5 w-5 text-slate-400" />
          Configurations de variantes
        </h3>
        {variantConfigs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucune configuration de variante.
          </p>
        ) : (
          <table className="mt-3 w-full rounded-xl border border-slate-200 bg-white text-sm">
            <tbody className="divide-y divide-slate-100">
              {variantConfigs.map((config) => (
                <tr key={config.id}>
                  <td className="px-4 py-2 font-medium text-slate-700">
                    {config.label}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{config.type}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {config.isRequired ? "Requis" : "Optionnel"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    niveau min {config.minRoleLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}