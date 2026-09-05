// components/admin/roles/detail/RolePermissionsEditor.tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateRolePermissionsAction } from '@/server/actions/admin/role-permissions/update-role-permissions';
import { resetRolePermissionsAction } from '@/server/actions/admin/role-permissions/reset-role-permissions';

type Permission = {
  id: string;
  code: string;
  name: string;
  category: string;
  isDangerous: boolean;
};

type Props = {
  roleId: string;
  permissions: Permission[];
  selectedIds: string[];
  inheritedCodes: string[];
  effectiveCodes: string[];
  missingMandatory: string[];
};

export function RolePermissionsEditor({
  roleId,
  permissions,
  selectedIds,
  inheritedCodes,
  effectiveCodes,
  missingMandatory,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [message, setMessage] = useState('');

  const byCategory = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const list = map.get(permission.category) ?? [];
      list.push(permission);
      map.set(permission.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function save() {
    startTransition(async () => {
      const result = await updateRolePermissionsAction(roleId, Array.from(selected));
      setMessage(result.success ? (result.message ?? 'Enregistré.') : result.error);
      router.refresh();
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetRolePermissionsAction(roleId);
      setSelected(new Set());
      setMessage(result.success ? (result.message ?? 'Réinitialisé.') : result.error);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-950">Matrice des permissions</h2>
        <p className="text-sm text-slate-500">{selected.size} / {permissions.length} activées</p>
      </div>

      {missingMandatory.length > 0 && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Permissions obligatoires manquantes (hors héritage) : {missingMandatory.join(', ')}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {byCategory.map(([category, items]) => (
          <fieldset key={category} className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{category}</legend>
            <div className="space-y-2">
              {items.map((permission) => {
                const inherited = inheritedCodes.includes(permission.code);
                return (
                  <label key={permission.id} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={selected.has(permission.id)} onChange={() => toggle(permission.id)} />
                    <span>
                      <code className="text-xs text-slate-700">{permission.code}</code>
                      {permission.isDangerous && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">dangereuse</span>}
                      {inherited && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">héritée</span>}
                      {effectiveCodes.includes(permission.code) && !selected.has(permission.id) && !inherited && (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">effective</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={save} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Enregistrer</button>
        <button type="button" disabled={pending} onClick={reset} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Réinitialiser</button>
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}
