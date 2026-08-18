// components/toggle/right-sidebar.tsx
"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useUIStore } from "@/store/use-ui-store";
import { useRBAC } from "@/hooks/rbac/use-rbac";
import { User, Heart, ShoppingBag, LayoutDashboard, Shield, LogIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export const RightSidebar = () => {
  const { isRightSidebarOpen, setRightSidebar } = useUIStore();
  const { user, isAuthenticated, roleConfig, isAdmin, isStaff } = useRBAC();

  const closeSidebar = () => setRightSidebar(false);
  const initials = getInitials(user?.name);
  const RoleIcon = roleConfig?.icon;

  return (
    <Sheet open={isRightSidebarOpen} onOpenChange={setRightSidebar}>
      <SheetContent side="right" className="w-80 bg-cyan-1000 border-l border-cyan-200 flex flex-col p-6">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="font-playfair text-2xl font-bold uppercase tracking-widest text-cyan-500">
            Espace Client
          </SheetTitle>
          <SheetDescription className="sr-only">
            Menu de navigation latérale et gestion de compte
          </SheetDescription>
        </SheetHeader>

        {/* Bloc utilisateur dynamique réactif à la SSOT */}
        {isAuthenticated && user && (
          <div className="mb-6 p-3 rounded-xl bg-white border border-cyan-200 shadow-sm flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-cyan-200">
              <AvatarImage src={user.image || undefined} alt={user.name || "Utilisateur"} />
              <AvatarFallback className="bg-cyan-500 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-cyan-500 truncate">{user.name}</p>
              <p className="text-xs text-cyan-500 truncate">{user.email}</p>
              {roleConfig && (
                <Badge className={`mt-1 gap-1 text-[9px] font-semibold px-1.5 py-0 ${roleConfig.bgClass} ${roleConfig.textClass} ${roleConfig.borderClass}`}>
                  {RoleIcon && <RoleIcon className="w-2.5 h-2.5" />}
                  {roleConfig.label}
                </Badge>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-3">
          <Link
            href="/profile"
            onClick={closeSidebar}
            className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-100 transition-colors group"
          >
            <User className="w-5 h-5 text-cyan-500 group-hover:text-cyan-700 transition-colors" />
            <span className="font-lato font-bold uppercase tracking-wider text-xs text-cyan-400 group-hover:text-cyan-500 transition-colors">
              Mon Profil
            </span>
          </Link>

          <Link
            href="/favorites"
            onClick={closeSidebar}
            className="flex items-center gap-4 p-2 rounded-lg hover:bg-cyan-100 transition-colors group"
          >
            <Heart className="w-5 h-5 text-cyan-600 group-hover:text-rose-500 transition-colors" />
            <span className="font-lato font-bold uppercase tracking-wider text-xs text-cyan-400 group-hover:text-rose-500 transition-colors">
              Mes Favoris
            </span>
          </Link>

          <Link
            href="/cart"
            onClick={closeSidebar}
            className="flex items-center gap-4 p-2 rounded-lg hover:bg-cyan-100 transition-colors group"
          >
            <ShoppingBag className="w-5 h-5 text-cyan-400 group-hover:text-cyan-500 transition-colors" />
            <span className="font-lato font-bold uppercase tracking-wider text-xs text-cyan-400 group-hover:text-cyan-500 transition-colors">
              Mon Panier
            </span>
          </Link>

          {/* Rôles privilège RBAC : Liens rapides Admin / Staff */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={closeSidebar}
              className="flex items-center gap-4 p-2 rounded-lg bg-cyan-50/80 border border-cyan-100 hover:bg-cyan-100/50 transition-colors mt-2"
            >
              <LayoutDashboard className="w-5 h-5 text-cyan-500" />
              <span className="font-lato font-bold uppercase tracking-wider text-xs text-cyan-500">
                Dashboard Admin
              </span>
            </Link>
          )}

          {isStaff && !isAdmin && (
            <Link
              href="/staff"
              onClick={closeSidebar}
              className="flex items-center gap-4 p-2 rounded-lg bg-cyan-50/80 border border-cyan-100 hover:bg-cyan-100/50 transition-colors mt-2"
            >
              <Shield className="w-5 h-5 text-cyan-700" />
              <span className="font-lato font-bold uppercase tracking-wider text-xs text-cyan-900">
                Espace {roleConfig?.label}
              </span>
            </Link>
          )}
        </nav>

        {/* Bouton de connexion contextuel pour invité */}
        {!isAuthenticated && (
          <div className="pt-4 border-t border-cyan-200">
            <Link
              href="/auth/sign-in"
              onClick={closeSidebar}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-cyan-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-cyan-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Se connecter
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
