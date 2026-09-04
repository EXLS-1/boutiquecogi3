// app/dashboard/settings/page.tsx
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

// Composants atomiques
import { GeneralSettings } from '@/components/dashboard/settings/general-settings';
import { RBACSettings } from '@/components/dashboard/settings/rbac-settings';
import { PaymentSettings } from '@/components/dashboard/settings/payment-settings';
import { SystemConfig } from '@/components/dashboard/settings/system-config';

// Constantes et défauts pour l'anti-fragilité
import {
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  SYSTEM_CONFIG_KEY,
  paymentConfigKey,
} from '@/lib/constants/settings';
import { ROLES } from '@/lib/auth/rbac';
import { PAYMENT_PROVIDERS, paymentSchema } from '@/lib/payment';
import { SYSTEM_DEFAULTS, systemConfigSchema, type SystemConfigValues } from '@/lib/system';

// Garde RBAC (règle d'or : JAMAIS auth.api.getSession() hors de lib/auth/server.ts)
import { resolveAuthContext } from '@/lib/auth/server';
import { db } from '@/lib/db';

import { Separator } from '@/components/ui/separator';
import { Settings2 } from 'lucide-react';

/**
 * Parse défensivement une valeur JSON de `SystemConfiguration`.
 * Retourne null si la clé est absente, le JSON est invalide ou la validation échoue.
 */
function parseJsonSetting<T>(
  raw: string | null | undefined,
  validate: (value: unknown) => T | null,
): T | null {
  if (!raw) return null;
  try {
    return validate(JSON.parse(raw));
  } catch {
    return null;
  }
}

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
  const authContext = await resolveAuthContext();
  if (!authContext || authContext.user.role !== ROLES.ADMIN) {
    redirect('/login'); // Redirection si non autorisé
  }

  // 2. Fetching concurrent de toutes les données (Performance)
  //    Stockage : SystemConfiguration (clé/valeur) + RoleConfig (RBAC).
  const [generalRows, roleDb, paymentRow, systemRow] = await Promise.all([
    db.systemConfiguration.findMany({
      where: { key: { in: Object.values(SETTINGS_KEYS) } },
    }),
    db.roleConfig.findFirst({ where: { role: ROLES.MANAGER } }),
    db.systemConfiguration.findUnique({
      where: { key: paymentConfigKey(PAYMENT_PROVIDERS.STRIPE) },
    }),
    db.systemConfiguration.findUnique({ where: { key: SYSTEM_CONFIG_KEY } }),
  ]);

  // 3. Mapping anti-fragile (Fallback sur les constantes par défaut)
  const generalMap = new Map(
    generalRows.map((row) => [row.key, row.value] as const),
  );

  const generalData = {
    storeName: generalMap.get(SETTINGS_KEYS.STORE_NAME) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.STORE_NAME],
    supportEmail: generalMap.get(SETTINGS_KEYS.SUPPORT_EMAIL) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SUPPORT_EMAIL],
    currency: generalMap.get(SETTINGS_KEYS.CURRENCY) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.CURRENCY],
  };

  // Permissions stockées en JSON { code: "ON" | "OFF" } (cf. seed RBAC + moteur runtime)
  const permissionMap = (roleDb?.permissions ?? {}) as Record<string, unknown>;
  const rbacData = {
    roleId: roleDb?.id ?? '',
    roleName: roleDb?.role ?? ROLES.MANAGER,
    currentPermissions: Object.entries(permissionMap)
      .filter(([, state]) => state === 'ON')
      .map(([code]) => code),
  };

  const paymentDb = parseJsonSetting(paymentRow?.value, (value) => {
    const parsed = paymentSchema.pick({ publicKey: true, isEnabled: true }).safeParse(value);
    return parsed.success ? parsed.data : null;
  });

  const paymentData = {
    provider: PAYMENT_PROVIDERS.STRIPE,
    publicKey: paymentDb?.publicKey ?? '',
    isEnabled: paymentDb?.isEnabled ?? false,
  };

  const systemDb = parseJsonSetting<SystemConfigValues>(systemRow?.value, (value) => {
    const parsed = systemConfigSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  });

  const systemData = systemDb ?? SYSTEM_DEFAULTS;


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
