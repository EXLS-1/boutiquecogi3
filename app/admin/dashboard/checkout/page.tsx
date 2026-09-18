// app/dashboard/checkout/page.tsx
// Checkout avec RBAC
// Level 3+ (Manager+) : configuration | Level 2+ (Admin+) : méthodes avancées

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";

import { CheckoutConfig } from "@/components/dashboard/checkout/checkout-config";
import { PaymentMethodsPanel } from "@/components/dashboard/checkout/payment-methods-panel";
import { CinetPayConfig } from "@/components/dashboard/checkout/cinetpay-config";
import { Skeleton } from "@/components/ui/skeleton";

export default async function CheckoutPage() {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { level, effectivePermissions } = session;

  if (level > 3) redirect("/unauthorized");

  const canConfigurePayments = effectivePermissions.has("payments:configure");
  const canViewAnalytics = effectivePermissions.has("payments:view_analytics");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Checkout & Paiements</h1>
        <p className="text-muted-foreground mt-1">Configuration CinetPay et méthodes de paiement</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64" />}>
        <CheckoutConfig />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-64" />}>
        <PaymentMethodsPanel canConfigure={canConfigurePayments} canViewAnalytics={canViewAnalytics} />
      </Suspense>

      {canConfigurePayments && (
        <Suspense fallback={<Skeleton className="h-64" />}>
          <CinetPayConfig />
        </Suspense>
      )}
    </div>
  );
}
