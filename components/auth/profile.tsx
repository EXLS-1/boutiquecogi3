// components/auth/profile.tsx
// Composant de profil utilisateur,
// affichant les informations de l'utilisateur connecté.
"use client";

import { authClient, useRBAC } from "@/lib/auth/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "./sign-out-button";
import { Mail, User } from "lucide-react";

export function Profile() {
  const { data: session, isPending } = authClient.useSession();
  const { roleConfig, isAdmin, isStaff } = useRBAC();

  if (isPending) {
    return (
      <div className="space-y-6 w-full max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) return null;

  const { user } = session;
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const RoleIcon = roleConfig.icon;

  return (
    <div className="space-y-8 w-full max-w-4xl animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Mon Profil
        </h1>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-white shadow-md">
            <AvatarImage src={user.image || ""} alt={user.name} />
            <AvatarFallback className="bg-cyan-600 text-white text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <p className="text-slate-500 text-lg">
              Bonjour,{" "}
              <span className="font-bold text-cyan-600">{user.name}</span>
            </p>
            <p className="text-sm text-slate-400">{user.email}</p>
            {/* Badge de rôle RBAC avec icon et couleurs contextuels */}
            <Badge
              className={`gap-1.5 text-xs font-semibold px-2.5 py-1 ${roleConfig.bgClass} ${roleConfig.textClass} ${roleConfig.borderClass} hover:${roleConfig.bgClass}`}
            >
              <RoleIcon className="w-3.5 h-3.5" />
              {roleConfig.label}
            </Badge>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-600" /> Informations du compte
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Nom complet
            </p>
            <p className="text-lg font-semibold text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {user.name}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4" /> Adresse Email
            </p>
            <p className="text-lg font-semibold text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {user.email}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <RoleIcon className="w-4 h-4" /> Rôle &amp; Accès
            </p>
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Badge
                className={`gap-1.5 text-xs font-bold px-3 py-1.5 ${roleConfig.bgClass} ${roleConfig.textClass} ${roleConfig.borderClass} hover:${roleConfig.bgClass}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                {roleConfig.label}
              </Badge>
              {isAdmin && (
                <span className="text-xs text-slate-500">— Accès complet au tableau de bord</span>
              )}
              {isStaff && !isAdmin && (
                <span className="text-xs text-slate-500">— Accès à l\'espace staff</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
          <SignOutButton variant="destructive" className="px-8" />
        </div>
      </section>
    </div>
  );
}
