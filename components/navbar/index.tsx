// components/navbar/index.tsx
"use client";

import React from "react";

import { NavbarRole } from "@/components/navbar/navbar-role";
import { NavbarSearch } from "@/components/navbar/navbar-search";
import { NavbarShell } from "@/components/navbar/navbar-shell";
import { NavbarBrand } from "@/components/navbar/navbar-brand";

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

      <div className="flex flex-1 justify-center px-4">
        <NavbarSearch />
      </div>

      <div className="flex items-center gap-4">
        <NavbarRole />
      </div>
    </NavbarShell>
  );
}