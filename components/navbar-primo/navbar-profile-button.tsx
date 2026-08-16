// components/navbar-primo/navbar-profile-button.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { useRBAC } from "@/hooks/rbac/use-rbac";
import { LogOut, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import SignInButton from "@/components/auth/sign-in-button";
import SignUpButton from "@/components/auth/sign-up-button";

/**
 * Fonction pure extraite du cycle de rendu React.
 * Zéro allocation dans le composant, performance maximale.
 */
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

export function NavbarProfileButton() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, roleConfig, isAdmin, isStaff } = useRBAC();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Calcul direct et ultra-rapide sans surcoût de useMemo
  const initials = getInitials(user?.name);

  if (isLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-3 animate-in fade-in duration-200">
        <SignUpButton />
        <SignInButton />
      </div>
    );
  }

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/auth/sign-in");
            router.refresh();
          },
          onError: (ctx) => {
            console.error("Erreur de déconnexion :", ctx.error.message);
            setIsSigningOut(false);
          },
        },
      });
    } catch (error) {
      console.error("Échec inattendu lors de la déconnexion :", error);
      setIsSigningOut(false);
    }
  };

  const RoleIcon = roleConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Menu utilisateur"
          className="relative group outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-full transition-transform active:scale-95"
        >
          <Avatar className="h-9 w-9 border border-cyan-100 shadow-sm group-hover:border-cyan-300">
            <AvatarImage src={user.image || undefined} alt={user.name || "Utilisateur"} />
            <AvatarFallback className="bg-cyan-700 text-white text-[10px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 mt-2 p-2 shadow-xl bg-cyan-50 border-cyan-200">
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-bold leading-none text-cyan-900 truncate">
              {user.name}
            </p>
            <p className="text-xs leading-none text-cyan-700 truncate">
              {user.email}
            </p>
            <Badge
              className={`w-fit gap-1 text-[10px] font-semibold px-2 py-0.5 ${roleConfig.bgClass} ${roleConfig.textClass} ${roleConfig.borderClass}`}
            >
              <RoleIcon className="w-3 h-3" />
              {roleConfig.label}
            </Badge>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="focus:bg-cyan-200 focus:text-cyan-900 cursor-pointer rounded-md">
          <Link href="/profile" className="flex items-center gap-2 w-full py-2 text-cyan-800">
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-[10px] bg-cyan-200 text-cyan-800">{initials}</AvatarFallback>
            </Avatar>
            Mon Profil
          </Link>
        </DropdownMenuItem>

        {/* Dashboard Admin */}
        {isAdmin && (
          <DropdownMenuItem asChild className="text-cyan-800 font-semibold focus:bg-cyan-200 focus:text-cyan-900 cursor-pointer rounded-md">
            <Link href="/admin" className="flex items-center gap-2 w-full py-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard Admin
            </Link>
          </DropdownMenuItem>
        )}

        {/* Espace Staff unifié */}
        {isStaff && !isAdmin && (
          <DropdownMenuItem asChild className="text-cyan-800 font-semibold focus:bg-cyan-200 focus:text-cyan-900 cursor-pointer rounded-md">
            <Link href="/staff" className="flex items-center gap-2 w-full py-2">
              <RoleIcon className="h-4 w-4" />
              Espace {roleConfig.label}
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="text-rose-600 focus:bg-rose-100 focus:text-rose-700 cursor-pointer rounded-md py-2 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isSigningOut ? "Déconnexion..." : "Se Déconnecter"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
