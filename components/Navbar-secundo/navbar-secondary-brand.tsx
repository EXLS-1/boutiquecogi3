// components/navbar-secndo/navbar-brand.tsx
// Ce composant est dédié à l'affichage de la marque (logo) dans la barre de navigation secondaire. Il est conçu pour être simple et flexible, permettant d'afficher un logo textuel ou une image, et de rediriger vers une URL spécifiée (par défaut vers la page d'accueil). Contrairement à la version précédente, ce composant ne contient plus de logique spécifique à une icône de panier, ce qui le rend plus générique et adaptable à différents besoins d'interface utilisateur.
// Contrairement à la version précédente, ce composant ne contient plus de logique spécifique à une icône de panier, ce qui le rend plus générique et adaptable à différents besoins d'interface utilisateur.

"use client";

import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

type NavbarBrandProps = {
  logo: string;
  href?: string;
  className?: string;
};

export function NavbarBrand({ logo, href = "/", className }: NavbarBrandProps) {
  return (
    <Link
      href={href}
      className={cn(
        "font-playfair text-2xl font-bold tracking-widest text-cyan-400 transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded",
        className
      )}
    >
      {logo}
    </Link>
  );
}
