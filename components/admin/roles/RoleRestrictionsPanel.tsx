'use client';

import { useState } from 'react';
import { updateRoleRestrictionsAction } from '@/server/actions/admin/roles';

const fields = [
  ['MAX_DAILY_ORDERS', 'Nombre maximal de commandes par jour', 'number'],
  ['MAX_PRODUCTS_PER_USER', 'Produits maximum par utilisateur', 'number'],
  ['MAX_STORAGE_MB', 'Stockage maximum (MB)', 'number'],
  ['MAX_TEAM_MEMBERS', 'Membres maximum dans l’équipe', 'number'],
  ['RATE_LIMIT_PER_MINUTE', 'Limite par minute', 'number'],
  ['SESSION_DURATION_HOURS', 'Durée de session (heures)', 'number'],
  ['CAN_ACCESS_API', 'Accès API', 'boolean'],
  ['REQUIRE_2FA', '2FA obligatoire', 'boolean'],
  ['REQUIRES_AUDIT_APPROVAL', 'Approbation audit obligatoire', 'boolean'],
] as const;

export function RoleRestrictionsPanel({ roles }: { roles: Array<{ id: string; role: string; level: number; restrictions: Record<string, unknown> }> }) {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [values, setValues] = useState<Record<string, unknown>>(roles[0]?.restrictions ?? {});
  const [message, setMessage] = useState('');
  const chooseRole = (id: string) => { setRoleId(id); setValues(roles.find((role) => role.id === id)?.restrictions ?? {}); setMessage(''); };
  const save = async () => { const result = await updateRoleRestrictionsAction(roleId, values); setMessage(result.success ? 'Restrictions enregistrées.' : result.error); };

  return <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <label className="block max-w-sm text-sm font-medium text-slate-700">Rôle<select value={roleId} onChange={(event) => chooseRole(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">{roles.map((role) => <option key={role.id} value={role.id}>{role.role} · niveau {role.level}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([key, label, type]) => <label key={key} className="text-sm font-medium text-slate-700">{label}{type === 'boolean' ? <input type="checkbox" className="ml-3" checked={values[key] === true} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.checked }))} /> : <input type="number" min={key === 'RATE_LIMIT_PER_MINUTE' || key === 'SESSION_DURATION_HOURS' ? 1 : 0} value={typeof values[key] === 'number' ? values[key] : ''} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value === '' ? undefined : Number(event.target.value) }))} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />}</label>)}
    </div>
    <div className="flex items-center gap-3"><button type="button" onClick={save} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Enregistrer</button>{message && <p className="text-sm text-slate-600">{message}</p>}</div>
  </section>;
}