// components/admin/roles/detail/RoleConfigActions.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  activateRoleAction,
  deactivateRoleAction,
  blockRoleAction,
  unblockRoleAction,
} from '@/server/actions/admin/roles/activate-role';

type Props = {
  roleId: string;
  isActive: boolean;
  isBlocked: boolean;
};

export function RoleConfigActions({ roleId, isActive, isBlocked }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.success ? 'Opération effectuée.' : (result.error ?? 'Erreur'));
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-950">Actions</h2>
      <div className="flex flex-wrap gap-2">
        {isActive ? (
          <button type="button" disabled={pending} onClick={() => run(() => deactivateRoleAction(roleId))} className="rounded-md border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50">Désactiver</button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => activateRoleAction(roleId))} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Activer</button>
        )}
        {isBlocked ? (
          <button type="button" disabled={pending} onClick={() => run(() => unblockRoleAction(roleId))} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Débloquer</button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => blockRoleAction(roleId, 'Blocage manuel depuis /admin/roles'))} className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Bloquer</button>
        )}
      </div>
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
  );
}
