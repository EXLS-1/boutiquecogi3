// app/dashboard/settings/rbac/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

import { RBACSettings } from '@/components/dashboard/settings/rbac-settings';

// Garde RBAC (règle d'or : JAMAIS auth.api.getSession() hors de lib/auth/server.ts)
import { resolveAuthContext } from '@/lib/auth/server';
import { ROLES } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: "Matrice RBAC | Paramètres",
  description:
    "Comparez et configurez les permissions par rôle, niveau et zone applicative.",
};

export default async function RBACSettingsPage() {
  // 1. Vérification des droits d'accès (Sécurité) — même garde que /dashboard/settings
  const authContext = await resolveAuthContext();
  if (!authContext || authContext.user.role !== ROLES.ADMIN) {
    redirect('/login');
  }

  // 2. Chargement du rôle MANAGER (config RBAC) et de ses permissions
  const roleDb = await db.roleDefinition.findFirst({
    where: { role: ROLES.MANAGER },
  });

  // Permissions stockées en JSON { code: "ON" | "OFF" } (cf. seed RBAC + moteur runtime)
  const permissionMap = (roleDb?.permissions ?? {}) as Record<string, unknown>;
  const rbacData = {
    roleId: roleDb?.id ?? '',
    roleName: roleDb?.name ?? ROLES.MANAGER,
    currentPermissions: Object.entries(permissionMap)
      .filter(([, state]) => state === 'ON')
      .map(([code]) => code),
  };

  return (
    <main className="container mx-auto max-w-4xl py-8 space-y-8">
      <header className="space-y-2">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour aux paramètres
        </Link>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-cyan-700" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Matrice RBAC
          </h1>
        </div>
        <p className="text-gray-500">
          Comparez et configurez les permissions par rôle, niveau et zone applicative.
        </p>
      </header>

      <Separator />

      <section aria-labelledby="rbac-settings-title">
        {rbacData.roleId ? (
          <RBACSettings {...rbacData} />
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            <p className="font-semibold">Rôle &quot;{ROLES.MANAGER}&quot; introuvable.</p>
            <p className="text-sm">
              Veuillez créer ce rôle dans la base de données pour configurer les permissions.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}