// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { Playfair_Display, Lato, Cormorant_Garamond, Inter } from "next/font/google";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { Navbar } from "@/components/navbar";
import { NavbarSecondary } from "@/components/navbar/navbar-secondary";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { Footer } from "@/components/footer";
import VideosCart from "@/components/video-show/videos-cart";
import { RootProviders } from "@/components/theme/root-providers";
import { UIWrapper } from "@/components/ui-wrapper";
import { cn } from "@/lib/utils";

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
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>  
      <body className="antialiased">
        <RootProviders>
          <CurrencySwitcher />
          <Navbar />
          <NavbarSecondary />
          
          <LeftSidebar />
          <RightSidebar />
         
          <UIWrapper>
              { /* pt-28 correspond à la hauteur de navbar (14) + navbar-secondary (14) */ }
            <main className="min-h-screen pt-28">
              { children }
              <VideosCart />
              {/* Chargez vos scripts ici de manière optimisée */}
                
            </main>
          </UIWrapper>

          <Footer />
        </RootProviders>
      </body>
    </html>
  );
}