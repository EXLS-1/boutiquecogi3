// app/dashboard/settings/page.tsx
// Configuration avec RBAC strict
// Level 2+ (Admin+) : paramètres généraux | Level 1 (Super Admin) : config système

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";

import { GeneralSettings } from "@/components/dashboard/settings/general-settings";
import { RBACSettings } from "@/components/dashboard/settings/rbac-settings";
import { PaymentSettings } from "@/components/dashboard/settings/payment-settings";
import { SystemConfig } from "@/components/dashboard/settings/system-config";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/signin");

  const { level, effectivePermissions } = session;

  if (level > 2) redirect("/unauthorized");

  const canManageRoles = effectivePermissions.has("settings:manage_roles");
  const canManagePermissions = effectivePermissions.has("settings:manage_permissions");
  const canSystemConfig = level <= 1 && effectivePermissions.has("settings:system_config");
  const canPaymentConfig = effectivePermissions.has("payments:configure");

  const params = await searchParams;
  const activeTab = params.tab || "general";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de Boutiquecogi3 · Level {level}</p>
      </div>

      {activeTab === "general" && (
        <Suspense fallback={<Skeleton className="h-96" />}>
          <GeneralSettings />
        </Suspense>
      )}

      {activeTab === "rbac" && canManageRoles && (
        <Suspense fallback={<Skeleton className="h-96" />}>
          <RBACSettings canManageRoles={canManageRoles} canManagePermissions={canManagePermissions} />
        </Suspense>
      )}

      {activeTab === "payments" && canPaymentConfig && (
        <Suspense fallback={<Skeleton className="h-96" />}>
          <PaymentSettings />
        </Suspense>
      )}

      {activeTab === "system" && canSystemConfig && (
        <Suspense fallback={<Skeleton className="h-96" />}>
          <SystemConfig />
        </Suspense>
      )}
    </div>
  );
}
