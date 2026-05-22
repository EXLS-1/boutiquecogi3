// components/navbar/navbar-brand.tsx
"use client";

import Link from "next/link";
import React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type NavbarBrandProps = {
  logo: string;
  href?: string;
  onMenuClick?: () => void;
  className?: string;
};

export function NavbarBrand({
  logo,
  href = "/",
  onMenuClick,
  className,
}: NavbarBrandProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {onMenuClick ? (
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-cyan-400 transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="h-6 w-6" />
        </button>
      ) : null}

      <Link
        href={href}
        className="font-playfair text-2xl font-bold tracking-widest text-cyan-400 transition-colors hover:text-pink-400"
      >
        {logo}
      </Link>
    </div>
  );
}