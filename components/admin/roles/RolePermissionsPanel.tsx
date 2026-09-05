'use client';

import { useState } from 'react';
import { updateRolePermissionsAction } from '@/server/actions/admin/roles';

type Permission = { id: string; code: string; name: string; category: string; isDangerous: boolean };
type Role = { id: string; role: string; level: number; permissionIds: string[] };

export function RolePermissionsPanel({ roles, permissions }: { roles: Role[]; permissions: Permission[] }) {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const role = roles.find((item) => item.id === roleId);
  const [selected, setSelected] = useState<string[]>(role?.permissionIds ?? []);
  const [message, setMessage] = useState('');

  function chooseRole(id: string) {
    setRoleId(id);
    setSelected(roles.find((item) => item.id === id)?.permissionIds ?? []);
    setMessage('');
  }

  async function save() {
    const result = await updateRolePermissionsAction(roleId, selected);
    setMessage(result.success ? 'Permissions enregistrées.' : result.error);
  }

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block max-w-sm text-sm font-medium text-slate-700">Rôle
        <select value={roleId} onChange={(event) => chooseRole(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
          {roles.map((item) => <option key={item.id} value={item.id}>{item.role} · niveau {item.level}</option>)}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(Object.groupBy(permissions, (permission) => permission.category)).map(([category, items]) => (
          <fieldset key={category} className="rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-900">{category}</legend>
            <div className="space-y-2">
              {(items ?? []).map((permission) => <label key={permission.id} className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={selected.includes(permission.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, permission.id] : current.filter((id) => id !== permission.id))} />
                <span><strong>{permission.name}</strong><br /><code className="text-xs text-slate-500">{permission.code}</code>{permission.isDangerous && <span className="ml-2 text-xs text-red-600">sensible</span>}</span>
              </label>)}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex items-center gap-3"><button type="button" onClick={save} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Enregistrer</button>{message && <p className="text-sm text-slate-600">{message}</p>}</div>
    </section>
  );
}