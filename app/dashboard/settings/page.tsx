// app/dashboard/settings/page.tsx
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

// Composants atomiques
import { GeneralSettings } from '@/components/dashboard/settings/general-settings';
import { RBACSettings } from '@/components/dashboard/settings/rbac-settings';
import { PaymentSettings } from '@/components/dashboard/settings/payment-settings';
import { SystemConfig } from '@/components/dashboard/settings/system-config';

// Constantes et défauts pour l'anti-fragilité
import { SETTINGS_DEFAULTS } from '@/lib/constants/settings';
import { ROLES } from '@/lib/auth/rbac';
import { PAYMENT_PROVIDERS } from '@/lib/payment';
import { SYSTEM_DEFAULTS } from '@/lib/system';

import { Separator } from '@/components/ui/separator';
import { Settings2 } from 'lucide-react';

/**
 * Metadata SEO pour la page de paramètres.
 */
export const metadata: Metadata = {
  title: 'Paramètres de la plateforme | Admin',
  description: 'Gérez les paramètres généraux, les rôles, les paiements et la configuration système de votre boutique.',
};

/**
 * Page principale des paramètres.
 * Minimaliste : se concentre uniquement sur le fetching concurrent et l'orchestration.
 */
export default async function SettingsPage() {
  // 1. Vérification des droits d'accès (Sécurité)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== ROLES.ADMIN) {
    redirect('/login'); // Redirection si non autorisé
  }

  // 2. Fetching concurrent de toutes les données (Performance)
  const [generalDb, roleDb, paymentDb, systemDb] = await Promise.all([
    db.siteSetting.findUnique({ where: { id: 'general' } }),
    db.role.findFirst({ where: { name: ROLES.MANAGER }, include: { permissions: true } }),
    db.paymentConfig.findUnique({ where: { provider: PAYMENT_PROVIDERS.STRIPE } }),
    db.systemConfig.findUnique({ where: { id: 'main' } }),
  ]);

  // 3. Mapping anti-fragile (Fallback sur les constantes par défaut)
  const generalData = {
    storeName: generalDb?.storeName ?? SETTINGS_DEFAULTS.storeName,
    supportEmail: generalDb?.supportEmail ?? SETTINGS_DEFAULTS.supportEmail,
    currency: generalDb?.currency ?? SETTINGS_DEFAULTS.currency,
  };

  const rbacData = {
    roleId: roleDb?.id ?? '',
    roleName: roleDb?.name ?? ROLES.MANAGER,
    currentPermissions: roleDb?.permissions.map((p) => p.permission) ?? [],
  };

  const paymentData = {
    provider: PAYMENT_PROVIDERS.STRIPE,
    publicKey: paymentDb?.publicKey ?? '',
    isEnabled: paymentDb?.isEnabled ?? false,
  };

  const systemData = {
    isMaintenanceMode: systemDb?.isMaintenanceMode ?? SYSTEM_DEFAULTS.isMaintenanceMode,
    logLevel: systemDb?.logLevel ?? SYSTEM_DEFAULTS.logLevel,
    cacheTtl: systemDb?.cacheTtl ?? SYSTEM_DEFAULTS.cacheTtl,
  };

  // 4. Rendu orchestré
  return (
    <main className="container mx-auto max-w-4xl py-8 space-y-8">
      {/* En-tête de la page */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Settings2 className="h-8 w-8 text-cyan-700" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Paramètres de la plateforme</h1>
        </div>
        <p className="text-gray-500">
          Configurez le comportement global, les accès, les paiements et le système de votre boutique.
        </p>
      </header>

      <Separator />

      {/* Section 1 : Paramètres Généraux */}
      <section aria-labelledby="general-settings-title">
        <GeneralSettings initialData={generalData} />
      </section>

      <Separator />

      {/* Section 2 : Contrôle d'accès (RBAC) */}
      <section aria-labelledby="rbac-settings-title">
        {rbacData.roleId ? (
          <RBACSettings {...rbacData} />
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            <p className="font-semibold">Rôle "{ROLES.MANAGER}" introuvable.</p>
            <p className="text-sm">Veuillez créer ce rôle dans la base de données pour configurer les permissions.</p>
          </div>
        )}
      </section>

      <Separator />

      {/* Section 3 : Paramètres de Paiement */}
      <section aria-labelledby="payment-settings-title">
        <PaymentSettings {...paymentData} />
      </section>

      <Separator />

      {/* Section 4 : Configuration Système */}
      <section aria-labelledby="system-settings-title">
        <SystemConfig initialData={systemData} />
      </section>
    </main>
  );
}
