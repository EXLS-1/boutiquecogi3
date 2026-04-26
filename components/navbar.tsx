"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/use-ui-store";

const CATEGORIES = [
  { label: "Femme", href: "/category/femme" },
  { label: "Homme", href: "/category/homme" },
  { label: "Enfant", href: "/category/enfant" },
  { label: "Sac", href: "/category/sac" },
  { label: "Chaussure", href: "/category/chaussure" },
  { label: "Accessoire", href: "/category/accessoire" },
];

export const Navbar = () => {
  const { toggleLeftSidebar, toggleRightSidebar } = useUIStore();

  return (
   <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-50 border-b border-cyan-400">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        
        {/* Extrême gauche : Tribar pour Left Sidebar */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLeftSidebar}
            className="p-2 text-cyan-400 hover:text-pink-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link 
            href="/" 
            className="font-playfair text-xl md:text-2xl font-bold tracking-widest uppercase text-cyan-400 hover:text-pink-400 transition-colors"
          >
            Boutique COGI
          </Link>
        </div>

        {/* Centre : Boutons de Catégories (Shadcn) */}
        <div className="hidden lg:flex items-center gap-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.label}
              variant="ghost"
              asChild
              className="font-lato font-bold uppercase tracking-wider text-cyan-400 hover:text-pink-400 hover:bg-pink-400/10 transition-all px-3"
            >
              <Link href={cat.href}>{cat.label}</Link>
            </Button>
          ))}
        </div>

        {/* Section Droite : Connexion et Tribar Right Sidebar */}
        <div className="flex items-center gap-4">
          <Link 
            href="/auth/login" 
            className="hidden md:block font-lato font-bold uppercase text-sm tracking-wider text-cyan-400 hover:text-pink-400 transition-colors"
          >
            Connexion
          </Link>
          
          {/* Extrême droite : Tribar pour Right Sidebar */}
          <button
            onClick={toggleRightSidebar}
            className="p-2 text-cyan-400 hover:text-pink-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
            aria-label="Ouvrir le panier et profil"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

      </div>
    </nav>
  );
};
