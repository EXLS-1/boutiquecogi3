// components/navbar-primo/navbar-profile-button.tsx
"use client";

import { authClient, useAuth } from "@/lib/auth/auth-client";
import Link from "next/link";
import { LogOut, User, ShieldCheck, LayoutDashboard } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SignInButton from "@/components/auth/sign-in-button";
import SignUpButton from "@/components/auth/sign-up-button";

/**
 * Composant NavbarProfileButton
 * Gère l'affichage du statut d'authentification dans la Navbar.
 */
export function NavbarProfileButton() {
  // La session est maintenant injectée via le Provider dans RootLayout.
  // isPending sera 'false' immédiatement si la session a été passée en initialData.
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  // Le skeleton ne s'affichera que si la session est réellement en cours de vérification 
  // (ex: changement de compte), et non au premier chargement.
  if (isPending) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  // Si l'utilisateur n'est pas authentifié, on force l'affichage des CTAs d'authentification.
  if (!session) {
    return (
      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
        <SignUpButton />
        <SignInButton />
      </div>
    );
  }

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Déconnexion réussie");
          router.push("/");
          router.refresh();
        }
      }
    });
  };

  const initials = session.user.name?.slice(0, 2).toUpperCase() || "U";
  const isAdmin = 
    session.user.role?.toLowerCase() === "admin" || 
    session.user.role === "ADMIN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative group outline-none focus:ring-2 focus:ring-cyan-500 rounded-full transition-all active:scale-95">
          <Avatar className="h-9 w-9 border border-cyan-100 shadow-sm group-hover:border-cyan-300">
            <AvatarImage src={session.user.image || ""} alt={session.user.name} />
            <AvatarFallback className="bg-cyan-700 text-white text-[10px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 mt-2 p-2 shadow-xl border-slate-200">
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none text-slate-900">{session.user.name}</p>
            <p className="text-xs leading-none text-slate-500 truncate">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="focus:bg-cyan-50 focus:text-cyan-700 cursor-pointer rounded-md">
          <Link href="/profile" className="flex items-center gap-2 w-full py-2">
            <User className="h-4 w-4" /> Mon Profil
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild className="text-cyan-700 font-semibold focus:bg-cyan-100 focus:text-cyan-800 cursor-pointer rounded-md">
            <Link href="/admin" className="flex items-center gap-2 w-full py-2">
              <ShieldCheck className="h-4 w-4" /> Dashboard Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer rounded-md py-2">
          <LogOut className="h-4 w-4 mr-2" /> Se Déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
