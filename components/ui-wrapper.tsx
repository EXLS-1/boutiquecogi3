"use client";

import { useUIStore } from "@/store/use-ui-store";
import { cn } from "@/lib/utils";

export const UIWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isLeftSidebarOpen, isRightSidebarOpen, closeAll } = useUIStore();
  
  const isAnyOpen = isLeftSidebarOpen || isRightSidebarOpen;

  return (
    <>
      {/* 1. OVERLAY : Assombrit l'écran et permet de fermer au clic */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300",
          isAnyOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )} 
        onClick={closeAll}
        aria-hidden="true"
      />
      
      {/* 2. LE CONTENEUR PRINCIPAL : Réagit à l'ouverture des sidebars */}
      <div 
        className={cn(
          // Styles de base et transition fluide
          "relative flex min-h-screen flex-col bg-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          
          // Si le menu de gauche est ouvert : décalage vers la droite (300px) + flou
          isLeftSidebarOpen && "translate-x-75 blur-[3px] opacity-70 pointer-events-none select-none",
          
          // Si le menu de droite est ouvert : décalage vers la gauche (100% sur mobile, 400px sur desktop) + flou
          isRightSidebarOpen && "-translate-x-full sm:-translate-x-100 blur-[3px] opacity-70 pointer-events-none select-none"
        )}
      >
        {children}
      </div>
    </>
  );
};