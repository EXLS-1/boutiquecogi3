// components/toggle/left-sidebar.tsx

"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUIStore } from "@/store/use-ui-store";
import Newsletter from "@/components/newsletter/newsletter";
import { subscribeToNewsletter } from "@/lib/actions/newsletter.actions";
import toast from "react-hot-toast";
import SocialIcons from "@/components/social/social-icon";

const MENU_LINKS = [
  { label: "Femme", href: "/categories/femme" },
  { label: "Homme", href: "/categories/homme" },
  { label: "Enfant", href: "/categories/enfant" },
  { label: "Sac", href: "/category/sac" },
  { label: "Chaussure", href: "/category/chaussure" },
  { label: "Accessoire", href: "/category/accessoire" },
];

export const LeftSidebar = () => {
   const onSubscribe = async (email: string) => {
      return await subscribeToNewsletter(email);
    };
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
          <Newsletter
            title="Newsletter Boutiquecogi3"
            description="Inscrivez-vous pour recevoir nos promotions et actualités."
            showFeedback={true}
            submitLabel="S'inscrire"
            onSubscribe={onSubscribe}
            onSuccess={() => toast.success("Inscription à la Newsletter réussie !")}
            onError={(_, message) => toast.error(message)}
          />
          <div className="space-y-4">
            <Link 
              href="/account/settings"
              onClick={() => setLeftSidebar(false)}
              className="block font-lato text-sm uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors"
            >
              Paramètres
            </Link>
            <Link 
              href="/contact"
              onClick={() => setLeftSidebar(false)}
              className="block font-lato text-sm uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors"
            >
              Contact
            </Link>

            <Link 
              href="/about"
              onClick={() => setLeftSidebar(false)}
              className="block font-lato text-sm uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors"
            >
              À propos
            </Link>

            <Link 
              href="/faq"
              onClick={() => setLeftSidebar(false)}
              className="block font-lato text-sm uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors"
            >
              FAQ
            </Link>


          </div>
        </nav>

        <footer className="mt-auto">
          <div className="flex justify-center gap-4 mb-6">
            <SocialIcons />
          </div>
          <p className="text-xs text-slate-400 font-lato text-center">
            &copy; {new Date().getFullYear()} Boutique COGI
          </p>
        </footer>
      </SheetContent>
    </Sheet>
  );
};