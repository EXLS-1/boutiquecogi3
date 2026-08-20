// app/admin/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerRBACSession } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, KeyRound, Users, Activity, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Administration Système | Central Security",
  description: "Portail d'administration réservé au personnel de niveau 1-2",
};

export default async function AdminPage() {
  const session = await getServerRBACSession();
    console.log("[ADMIN] session:", session);
    
  // 1. Authentification
  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }

  // 2. Autorisation stricte : Réservé aux niveaux 1 (Super Admin) et 2 (Admin)
  if (session.level > 2) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10 space-y-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-mono uppercase tracking-widest font-semibold">Zone Privilégiée</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Portail d&apos;Administration</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Connecté en tant que <span className="text-neutral-200 font-medium">{session.userId}</span> ({session.role.name} — Niveau {session.level})
          </p>
        </div>
        <Button asChild variant="outline" className="border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            Vue Dashboard Général
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Grille de modules d'administration */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Sécurité & 2FA</CardTitle>
            <KeyRound className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <CardDescription className="text-neutral-400">
              Configuration de l&apos;authentification à deux facteurs et gestion des clés TOTP d&apos;urgence.
            </CardDescription>
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/admin/setup-2fa">Gérer le 2FA</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Gestion des Comptes</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <CardDescription className="text-neutral-400">
              Audit des utilisateurs, déblocage de comptes et attribution directe des rôles RBAC.
            </CardDescription>
            <Button asChild variant="secondary" className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700">
              <Link href="/admin/users">Administrer les Utilisateurs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Logs & Audit Système</CardTitle>
            <Activity className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <CardDescription className="text-neutral-400">
              Inspection des journaux d&apos;évènements, traçabilité des mutations BDD et sessions actives.
            </CardDescription>
            <Button asChild variant="secondary" className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700">
              <Link href="/dashboard/audit">Consulter les Logs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
