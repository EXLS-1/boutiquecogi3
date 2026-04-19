// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Playfair_Display, Lato, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { RootProviders } from "@/components/root-providers";
import { UIWrapper } from "@/components/ui-wrapper";
import { cn } from "@/lib/utils";
import { defaultUrl } from "@/lib/constants";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-lato" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant" });

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Boutique COGI",
  description: "Boutique en ligne de mode élégante - Habits pour femmes, hommes et enfants",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn(playfair.variable, lato.variable, cormorant.variable, "font-sans", inter.variable)}>
      
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
        
      <body className="bg-var() text-(--text-primary) font-outfit overflow-x-hidden leading-[1.7] antialiased">
        <RootProviders>
          
          <Navbar />
          
          <LeftSidebar />
          
          <RightSidebar />

          <Hero />
          
          <UIWrapper>
            <main className="min-h-screen bg-white pt-17.5">
              {children}
            </main>
          </UIWrapper>

        </RootProviders>
        
        <footer />
               
      </body>

    </html>
  );
}