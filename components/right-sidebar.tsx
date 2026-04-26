"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUIStore } from "@/store/use-ui-store";
import { User, Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";

export const RightSidebar = () => {
  const { isRightSidebarOpen, setRightSidebar } = useUIStore();

  return (
    <Sheet open={isRightSidebarOpen} onOpenChange={setRightSidebar}>
      <SheetContent side="right" className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col p-6">
        <SheetHeader className="mb-8 text-left">
          <SheetTitle className="font-playfair text-2xl font-bold uppercase tracking-widest text-sky-500">
            Espace Client
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-6">
          <Link
            href="/profile"
            onClick={() => setRightSidebar(false)}
            className="flex items-center gap-4 group"
          >
            <User className="w-5 h-5 text-sky-500 group-hover:text-rose-500 transition-colors" />
            <span className="font-lato font-bold uppercase tracking-wider text-slate-950 group-hover:text-rose-500 transition-colors">
              Mon Profil
            </span>
          </Link>

          <Link
            href="/favorites"
            onClick={() => setRightSidebar(false)}
            className="flex items-center gap-4 group"
          >
            <Heart className="w-5 h-5 text-sky-500 group-hover:text-rose-500 transition-colors" />
            <span className="font-lato font-bold uppercase tracking-wider text-slate-950 group-hover:text-rose-500 transition-colors">
              Mes Favoris
            </span>
          </Link>

          <Link
            href="/cart"
            onClick={() => setRightSidebar(false)}
            className="flex items-center gap-4 group"
          >
            <ShoppingBag className="w-5 h-5 text-sky-500 group-hover:text-rose-500 transition-colors" />
            <span className="font-lato font-bold uppercase tracking-wider text-slate-950 group-hover:text-rose-500 transition-colors">
              Mon Panier
            </span>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
};