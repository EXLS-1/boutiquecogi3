// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Playfair_Display, Lato, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "lucide-react";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { RootProviders } from "@/components/root-providers";
import { UIWrapper } from "@/components/ui-wrapper";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-lato" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant" });
const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Boutique COGI",
  description: "Boutique en ligne de mode élégante - Vêtements pour femmes, hommes et enfants",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn(playfair.variable, lato.variable, cormorant.variable, "font-sans", inter.variable)}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      {/* On applique les styles de base directement sur le body via Tailwind */}
      <body className="bg-var() text-(--text-primary) font-outfit overflow-x-hidden leading-[1.7] antialiased">
        <RootProviders>
          <Sidebar/>
          <LeftSidebar />
          <RightSidebar />
          
          <UIWrapper>
            <Navbar />
            {/* Remplacement de .main-wrapper par du Tailwind pur (pt-[70px]) */}
            <main className="min-h-screen bg-white pt-17.5">
              {children}
            </main>
          </UIWrapper>
        </RootProviders>
        <footer className="bg-gray-800 text-white text-center py-4 mt-10">
          <p>&copy; {new Date().getFullYear()} Boutique COGI. Tous droits réservés.</p>
        </footer>
      </body>
    </html>
  );
}