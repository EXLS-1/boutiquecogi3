// components/navbar/index.tsx
"use client";

import React from "react";

import { useUIStore } from "@/store/use-ui-store";
import { NavbarRole } from "@/components/navbar/navbar-role";
import { NavbarSearch } from "@/components/navbar/navbar-search";
import { NavbarShell } from "@/components/navbar/navbar-shell";
import { NavbarBrand } from "@/components/navbar/navbar-brand";
import {
  NavbarLinks,
  type NavbarLinkItem,
} from "@/components/navbar/navbar-links";
import { NavbarActions } from "@/components/navbar/navbar-actions";

const CATEGORY_LINKS: NavbarLinkItem[] = [
  { label: "Femme", href: "/category/femme" },
  { label: "Homme", href: "/category/homme" },
  { label: "Enfant", href: "/category/enfant" },
  { label: "Sac", href: "/category/sac" },
  { label: "Chaussure", href: "/category/chaussure" },
  { label: "Accessoire", href: "/category/accessoire" },
];

type NavbarProps = {
  logo?: string;
  links?: NavbarLinkItem[];
};

export function Navbar({
  logo = "Boutique COGI",
  links = CATEGORY_LINKS,
}: NavbarProps) {
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useUIStore();

  return (
    <NavbarShell>
      
      <NavbarBrand
        logo={logo}
        onMenuClick={toggleLeftSidebar}
      />
      
     

      <NavbarRole />
      
      <NavbarSearch />

      <NavbarActions onMenuClick={toggleRightSidebar}/>
      
      
    </NavbarShell>
  );
}