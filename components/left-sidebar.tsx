"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUIStore } from "@/store/use-ui-store";

const MENU_LINKS = [
  { label: "Femme", href: "/category/femme" },
  { label: "Homme", href: "/category/homme" },
  { label: "Enfant", href: "/category/enfant" },
  { label: "Sac", href: "/category/sac" },
  { label: "Chaussure", href: "/category/chaussure" },
  { label: "Accessoire", href: "/category/accessoire" },
];

const SOCIAL_LINKS = [
  { label: "WhatsApp", icon: "fab fa-whatsapp", href: "#" },
  { label: "Facebook", icon: "fab fa-facebook", href: "#" },
  { label: "Instagram", icon: "fab fa-instagram", href: "#" },
  { label: "TikTok", icon: "fab fa-tiktok", href: "#" },
];

export const LeftSidebar = () => {
  const { isLeftSidebarOpen, setLeftSidebar } = useUIStore();

  return (
    <Sheet open={isLeftSidebarOpen} onOpenChange={setLeftSidebar}>
      <SheetContent side="left" className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col p-6">
        <SheetHeader className="mb-8 text-left">
          <SheetTitle className="font-playfair text-2xl font-bold uppercase tracking-widest text-sky-500">
            Menu Principal
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-6">
          <div className="space-y-4">
            {MENU_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setLeftSidebar(false)}
                className="block font-lato font-bold text-lg uppercase tracking-wide text-slate-950 hover:text-rose-500 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <hr className="border-slate-200 my-6" />

          <div className="space-y-4">
            <Link 
              href="/settings"
              onClick={() => setLeftSidebar(false)}
              className="block font-lato text-sm uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors"
            >
              Paramètres
            </Link>
          </div>
        </nav>

        <footer className="mt-auto">
          <div className="flex gap-4 mb-6">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="text-sky-500 hover:text-rose-500 transition-colors text-xl"
              >
                <i className={social.icon}></i>
              </a>
            ))}
          </div>
          <p className="text-xs text-slate-400 font-lato">
            &copy; {new Date().getFullYear()} Boutique COGI
          </p>
        </footer>
      </SheetContent>
    </Sheet>
  );
};