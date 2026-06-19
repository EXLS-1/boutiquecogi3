// components/dashboard/widgets/recent-orders.tsx
// ============================================
// WIDGET : COMMANDES RÉCENTES
// Permissions: orders:read
// Niveaux: LEVEL 1-5 (Super-Admin → Supervisor)
// GUEST: ❌ Non autorisé
// ============================================

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  getCurrentUserWithRole,
  hasPermission,
} from "@/lib/auth/rbac";
import {
  WidgetShell,
  WidgetSkeleton,
  WidgetForbidden,
  formatCurrency,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  total: number;
  status: string;
  createdAt: Date;
}

// ───────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toUpperCase()) {
    case "COMPLETED":
    case "DELIVERED":
      return "default";
    case "PENDING":
    case "PROCESSING":
      return "secondary";
    case "CANCELLED":
    case "REFUNDED":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "En attente",
    PROCESSING: "En cours",
    COMPLETED: "Terminée",
    DELIVERED: "Livrée",
    CANCELLED: "Annulée",
    REFUNDED: "Remboursée",
  };
  return labels[status.toUpperCase()] ?? status;
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchRecentOrders(limit: number = 8): Promise<RecentOrder[]> {
  const orders = await prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customer: order.user?.name ?? order.user?.email ?? "Client anonyme",
    total: order.totalAmount ?? 0,
    status: order.status,
    createdAt: order.createdAt,
  }));
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function RecentOrdersContent({
  className,
  limit = 8,
}: WidgetProps & { limit?: number }) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Commandes récentes" />;
  }

  const { role } = userData;
  const allowed = await hasPermission(role, PERMISSIONS.ORDERS_READ);

  if (!allowed) {
    return <WidgetForbidden title="Commandes récentes" />;
  }

  const orders = await fetchRecentOrders(limit);

  return (
    <WidgetShell
      title="Commandes récentes"
      icon={ShoppingCart}
      className={className}
      action={
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href="/dashboard/orders">
            Voir tout <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">N° Commande</TableHead>
              <TableHead className="text-xs">Client</TableHead>
              <TableHead className="text-xs text-right">Montant</TableHead>
              <TableHead className="text-xs text-center">Statut</TableHead>
              <TableHead className="text-xs text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                  Aucune commande récente.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-xs font-medium">
                    #{order.orderNumber}
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[120px]">
                    {order.customer}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={getStatusBadgeVariant(order.status)}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right text-muted-foreground">
                    {order.createdAt.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function RecentOrders({
  className,
  limit,
}: WidgetProps & { limit?: number }) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={5} />}>
      <RecentOrdersContent className={className} limit={limit} />
    </Suspense>
  );
}
