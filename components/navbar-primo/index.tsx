// components/navbar/index.tsx
"use client";

import React from "react";
import { NavbarRole } from "@/components/navbar-primo/navbar-role";
import { NavbarSearch } from "@/components/navbar-primo/navbar-search";
import { NavbarShell } from "@/components/navbar-primo/navbar-shell";
import { NavbarBrand } from "@/components/Navbar-secundo/navbar-brand";
import { CurrencySwitcher } from "@/components/currency-switcher";

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
      </div>

      <div className="flex items-center gap-4">
        <NavbarRole />
      </div>
    </NavbarShell>
  );
}