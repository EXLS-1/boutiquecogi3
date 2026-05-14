// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { Playfair_Display, Lato, Cormorant_Garamond, Inter } from "next/font/google";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { Navbar } from "@/components/navbar";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { Footer } from "@/components/footer";
import { RootProviders } from "@/components/root-providers";
import { UIWrapper } from "@/components/ui-wrapper";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";
import { CurrencyProvider } from "./provider";

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
  
  const cookieStore = await cookies();
  const currencyCookie = cookieStore.get("displayCurrency")?.value as "USD" | "CDF" | undefined;
  const initialCurrency = currencyCookie || "USD";
  
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>  
      <body className="antialiased">
        <RootProviders>
          <CurrencySwitcher />
          <Navbar />
          <LeftSidebar />
          <RightSidebar />
         
          <UIWrapper>
              { /* pt-14 correspond à la hauteur de ta navbar */ }
            <main className="min-h-screen pt-14">
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