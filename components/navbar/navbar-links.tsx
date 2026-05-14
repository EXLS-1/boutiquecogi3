// components/navbar/navbar-links.tsx
"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavbarLinkItem = {
  label: string;
  href: string;
};

type NavbarLinksProps = {
  items: NavbarLinkItem[];
  className?: string;
};

export function NavbarLinks({
  items,
  className,
}: NavbarLinksProps) {
  return (
    <div
      className={cn(
        "hidden items-center gap-1 lg:flex",
        className
      )}
    >
      {items.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          asChild
          className="px-3 font-lato uppercase tracking-wider text-cyan-400 transition-all hover:bg-pink-400/10 hover:text-pink-400"
        >
          <Link href={item.href}>
            {item.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}