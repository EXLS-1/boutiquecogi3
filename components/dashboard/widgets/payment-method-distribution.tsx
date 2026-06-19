// components/dashboard/widgets/payment-method-distribution.tsx
// ============================================
// WIDGET : RÉPARTITION MOYENS DE PAIEMENT
// Permissions: analytics:read + orders:read
// Niveaux: LEVEL 1-3 (Super-Admin, Admin, Manager)
// ============================================

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  getCurrentUserWithRole,
  hasAllPermissions,
} from "@/lib/auth/rbac";
import {
  WidgetShell,
  WidgetSkeleton,
  WidgetForbidden,
  formatCurrency,
  formatNumber,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { CreditCard, Smartphone, Banknote, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface PaymentMethod {
  method: string;
  count: number;
  amount: number;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// ───────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────

function getPaymentIcon(method: string): React.ComponentType<{ className?: string }> {
  const m = method.toLowerCase();
  if (m.includes("mobile") || m.includes("momo") || m.includes("orange") || m.includes("wave")) return Smartphone;
  if (m.includes("cash") || m.includes("especes") || m.includes("livraison")) return Banknote;
  if (m.includes("wallet") || m.includes("porte")) return Wallet;
  return CreditCard;
}

function getPaymentColor(method: string): string {
  const m = method.toLowerCase();
  if (m.includes("mobile") || m.includes("momo")) return "bg-orange-500";
  if (m.includes("orange")) return "bg-orange-400";
  if (m.includes("wave")) return "bg-blue-500";
  if (m.includes("card") || m.includes("carte")) return "bg-emerald-500";
  if (m.includes("cash")) return "bg-amber-500";
  return "bg-gray-500";
}

function getPaymentLabel(method: string): string {
  const labels: Record<string, string> = {
    MOBILE_MONEY: "Mobile Money",
    ORANGE_MONEY: "Orange Money",
    WAVE: "Wave",
    CREDIT_CARD: "Carte bancaire",
    CASH_ON_DELIVERY: "Paiement à la livraison",
    BANK_TRANSFER: "Virement bancaire",
  };
  return labels[method] ?? method;
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchPaymentDistribution(): Promise<PaymentMethod[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const payments = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: {
      createdAt: { gte: thirtyDaysAgo },
      status: "COMPLETED",
    },
    _count: { paymentMethod: true },
    _sum: { totalAmount: true },
  });

  const totalAmount = payments.reduce((sum, p) => sum + (p._sum.totalAmount ?? 0), 0);

  return payments.map((p) => {
    const method = p.paymentMethod ?? "UNKNOWN";
    const amount = p._sum.totalAmount ?? 0;
    const count = p._count.paymentMethod;

    return {
      method,
      count,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      icon: getPaymentIcon(method),
      color: getPaymentColor(method),
    };
  }).sort((a, b) => b.amount - a.amount);
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function PaymentMethodDistributionContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Moyens de paiement" />;
  }

  const { role } = userData;
  const allowed = await hasAllPermissions(role, [
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ORDERS_READ,
  ]);

  if (!allowed) {
    return <WidgetForbidden title="Moyens de paiement" />;
  }

  const methods = await fetchPaymentDistribution();
  const totalAmount = methods.reduce((sum, m) => sum + m.amount, 0);
  const totalCount = methods.reduce((sum, m) => sum + m.count, 0);

  return (
    <WidgetShell
      title="Moyens de paiement (30j)"
      icon={CreditCard}
      className={className}
    >
      <div className="space-y-4">
        {/* Résumé */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatNumber(totalCount)} transactions</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>

        {/* Barre empilée */}
        <div className="flex h-3 rounded-full overflow-hidden">
          {methods.map((m) => (
            <div
              key={m.method}
              className={`${m.color} transition-all`}
              style={{ width: `${m.percentage}%` }}
              title={`${getPaymentLabel(m.method)}: ${m.percentage.toFixed(1)}%`}
            />
          ))}
        </div>

        {/* Détail */}
        <div className="space-y-2">
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune transaction trouvée.
            </p>
          ) : (
            methods.map((method) => {
              const Icon = method.icon;
              return (
                <div
                  key={method.method}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className={`h-8 w-8 rounded-full ${method.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {getPaymentLabel(method.method)}
                      </span>
                      <span className="text-xs font-medium">
                        {formatCurrency(method.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatNumber(method.count)} transactions
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {method.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function PaymentMethodDistribution({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={4} />}>
      <PaymentMethodDistributionContent className={className} />
    </Suspense>
  );
}
