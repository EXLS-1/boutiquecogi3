// components/navbar/index.tsx
// Ce composant de barre de navigation est conçu pour être flexible et réutilisable, avec des sous-composants pour la marque, la recherche, les rôles et le panier. Il utilise des Server Actions pour récupérer les données du panier de manière efficace, tout en offrant une expérience utilisateur fluide grâce à Suspense pour le chargement du panier.
"use client";

import React, { Suspense } from "react";
import { NavbarRole } from "@/components/navbar-primo/navbar-role";
import { NavbarSearch } from "@/components/navbar-primo/navbar-search";
import { NavbarShell } from "@/components/navbar-primo/navbar-shell";
import { NavbarBrand } from "@/components/Navbar-secundo/navbar-brand";
import { CurrencySwitcher } from "@/components/currency-switcher";
import CartIcon from "../cart/cart-icon";

type NavbarProps = {
  logo?: string;
};

export function Navbar({
  logo = "Boutique COGI",
}: NavbarProps) {
  return (
    <NavbarShell>
      <div className="flex items-center gap-4">
        <NavbarBrand logo={logo} />
      </div>

      <div className="flex justify-center gap-7 px-4 w-xl mx-auto border-cyan-700">
        <NavbarSearch />
        <CurrencySwitcher />
        <Suspense fallback={<div className="h-6 w-6 rounded-full bg-gray-200 animate-pulse" aria-label="Loading cart" />}>
          <CartIcon />
        </Suspense>
      </div>

      <div className="flex items-center gap-4">
        <NavbarRole />
      </div>
    </NavbarShell>
  );
}