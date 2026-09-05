// components/admin/roles/detail/RoleRestrictionsEditor.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateRoleRestrictionsAction } from '@/server/actions/admin/role-restrictions/update-role-restrictions';
import { resetRoleRestrictionsAction } from '@/server/actions/admin/role-restrictions/reset-role-restrictions';

const NUMERIC_FIELDS: Array<[string, string, number]> = [
  ['MAX_DAILY_ORDERS', 'Quota : commandes / jour', 0],
  ['MAX_PRODUCTS_PER_USER', 'Quota : produits / utilisateur', 0],
  ['MAX_STORAGE_MB', 'Quota : stockage (MB)', 0],
  ['MAX_TEAM_MEMBERS', 'Quota : membres équipe', 0],
  ['RATE_LIMIT_PER_MINUTE', 'Rate limit / minute', 1],
  ['SESSION_DURATION_HOURS', 'Durée de session (h)', 1],
  ['AUDIT_MAX_DURATION_MINUTES', "Durée max d'audit (min)", 1],
];

const BOOLEAN_FIELDS: Array<[string, string]> = [
  ['CAN_ACCESS_API', 'Accès API'],
  ['CAN_ACCESS_WEBHOOKS', 'Accès Webhooks'],
  ['CAN_ACCESS_ADVANCED_ANALYTICS', 'Analytics avancés'],
  ['CAN_EXPORT_DATA', 'Export de données'],
  ['CAN_USE_BULK_ACTIONS', 'Actions en masse'],
  ['REQUIRE_2FA', '2FA obligatoire'],
  ['REQUIRE_APPROVAL_FOR_DELETE', 'Approbation pour suppression'],
  ['REQUIRES_AUDIT_APPROVAL', "Approbation d'audit"],
  ['RESTRICTED_TO_OWN_DATA', 'Limité aux propres données'],
];

type Props = {
  roleId: string;
  restrictions: Record<string, unknown>;
};

export function RoleRestrictionsEditor({ roleId, restrictions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, unknown>>(restrictions);
  const [message, setMessage] = useState('');

  function save() {
    startTransition(async () => {
      const result = await updateRoleRestrictionsAction(roleId, values);
      setMessage(result.success ? (result.message ?? 'Enregistré.') : result.error);
      router.refresh();
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetRoleRestrictionsAction(roleId);
      setValues({});
      setMessage(result.success ? (result.message ?? 'Réinitialisé.') : result.error);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Restrictions</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {NUMERIC_FIELDS.map(([key, label, min]) => (
          <label key={key} className="text-sm font-medium text-slate-700">
            {label}
            <input type="number" min={min} value={typeof values[key] === 'number' ? (values[key] as number) : ''} onChange={(e) => setValues({ ...values, [key]: e.target.value === '' ? undefined : Number(e.target.value) })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>
        ))}
        {BOOLEAN_FIELDS.map(([key, label]) => (
          <label key={key} className="text-sm font-medium text-slate-700">
            <input type="checkbox" className="mr-2" checked={values[key] === true} onChange={(e) => setValues({ ...values, [key]: e.target.checked })} />
            {label}
          </label>
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
