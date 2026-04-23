// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { Playfair_Display, Lato, Cormorant_Garamond, Inter } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { Footer } from "@/components/footer";
import { RootProviders } from "@/components/root-providers";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn(playfair.variable, lato.variable, cormorant.variable, inter.variable, "scroll-smooth")}>
      <head>
        {/* FontAwesome est lourd, mais conservé selon ta structure actuelle */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased overflow-x-hidden">
        <RootProviders>
          <Navbar />
          <LeftSidebar />
          <RightSidebar />
          
          <UIWrapper>
              { /* pt-17.5 correspond à la hauteur de ta navbar (50px) */ }
            <main className="min-h-screen pt-[var(--navbar-height)]">
              { children }
            </main>
          </UIWrapper>

          <Footer />
        </RootProviders>
      </body>
    </html>
  );
}