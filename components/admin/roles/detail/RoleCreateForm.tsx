// components/admin/roles/detail/RoleCreateForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRoleAction } from '@/server/actions/admin/roles/create-role';

const LEVELS = [2, 3, 4, 5, 6];

export function RoleCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', level: 4, description: '', isActive: true });

  function submit() {
    startTransition(async () => {
      const result = await createRoleAction(form);
      if (result.success) {
        setMessage(`Rôle « ${form.name} » créé.`);
        router.push(`/admin/roles/${result.data.id}`);
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-medium text-slate-700">
        Nom (MAJUSCULES_UNDERSCORES)
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" placeholder="MODERATEUR" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Niveau (2 = Admin, 6 = Utilisateur)
        <select value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2">
          {LEVELS.map((level) => <option key={level} value={level}>Niveau {level}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Description
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={255} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        Actif dès la création
      </label>
      <button type="button" disabled={pending || !form.name} onClick={submit} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? 'Création…' : 'Créer le rôle'}
      </button>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}
