// components/navbar/index.tsx
"use client";

import React from "react";

import { useUIStore } from "@/store/use-ui-store";
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
  const { toggleLeftSidebar } = useUIStore();

  return (
    <NavbarShell>
      <NavbarBrand
        logo={logo}
        onMenuClick={toggleLeftSidebar}
      />

      <NavbarRole />
      
      <NavbarSearch />
    </NavbarShell>
  );
}