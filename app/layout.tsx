// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import React, { Suspense } from "react";
import { Playfair_Display, Lato, Cormorant_Garamond, Inter } from "next/font/google";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

import { Navbar } from "@/components/navbar-primo";
import { NavbarSecondary } from "@/components/Navbar-secundo/navbar-secondary";
import { LeftSidebar } from "@/components/toggle/left-sidebar";
import { RightSidebar } from "@/components/toggle/right-sidebar";
import { Footer } from "@/components/footer";
import { RootProviders } from "@/components/theme/root-providers";
import { UIWrapper } from "@/components/toggle/ui-wrapper";
import { CartSyncManager } from "@/components/cart/cart-sync-manager";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-lato" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant" });

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: "Boutique COGI",
  description: "Boutique en ligne de mode élégante - Habits pour femmes, hommes et enfants",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Récupération de la session côté serveur pour éviter le flash du skeleton (FOUC)
  const authSession = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${lato.variable} ${cormorant.variable} antialiased font-sans`}>
        <RootProviders session={authSession}>
          <CartSyncManager />
          {/* Injection directe de la session pour supprimer le délai d'hydratation */}
          <Navbar />
          
          {/* Suspense est crucial ici car NavbarSecondary utilise useSearchParams */}
          <Suspense fallback={<div className="h-14 w-full bg-cyan-100 animate-pulse border-b border-cyan-700" />}>
            <NavbarSecondary />
          </Suspense>
          
          <LeftSidebar />
          <RightSidebar />
         
          <UIWrapper>
              { /* pt-28 correspond à la hauteur de navbar (14) + navbar-secondary (14) */ }
            <main className="min-h-screen pt-28">
              { children }
            
              {/* Chargez vos scripts ici de manière optimisée */}
               
            </main>
          </UIWrapper>

          <Footer />
        </RootProviders>
      </body>
    </html>
  );
}