"use client";

import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

/**
 * AdminLayout
 * Sécurise toutes les routes sous /admin.
 * Redirige vers /403 si l'utilisateur n'est pas autorisé.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, isPending } = useIsAdmin();

  // Gestion du chargement pour éviter le "Flash of Unprivileged Content"
  if (isPending) {
    return (
      <div className="flex h-screen w-full flex-col gap-4 p-8">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }

  // Redirection immédiate si non autorisé
  if (!isAdmin) {
    redirect("/403");
  }

  return <div className="min-h-screen bg-slate-50/50">{children}</div>;
}