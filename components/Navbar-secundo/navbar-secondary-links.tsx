// components/navbar-secundo/navbar-secondary-links.tsx
"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "@/types/navbar-secondary";

interface NavbarSecondaryLinksContentProps {
  items: NavItem[];
}

function getCategoryFromHref(href: string): string | null {
  try {
    const url = new URL(href, "http://localhost:3000");
    return url.searchParams.get("category");
  } catch {
    return null;
  }
}

function NavbarSecondaryLinksContent({ items }: NavbarSecondaryLinksContentProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeCategory = searchParams.get("category");

  return (
    <div 
      className="
        flex items-center justify-start md:justify-center gap-1 w-full overflow-x-auto 
        whitespace-nowrap scroll-smooth snap-x snap-mandatory px-1 md:px-0
        [-ms-overflow-style:none] [scrollbar-none] [&::-webkit-scrollbar]:hidden
      "
    >
      {/* Catégories Dynamiques */}
      {items.map((item) => {
        const targetCategory = getCategoryFromHref(item.href);
        const isActive = 
          pathname === "/products" && activeCategory !== null && activeCategory === targetCategory;

        return (
          <Button
            key={item.href}
            variant="ghost"
            asChild
            className={cn(
              "px-3 font-lato text-xs sm:text-sm uppercase tracking-wider transition-all shrink-0 snap-start",
              isActive
                ? "text-pink-500 underline decoration-2 underline-offset-4"
                : "text-cyan-600 hover:text-pink-400"
            )}
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </div>
  );
}

function SecondaryLinksSkeleton() {
  return (
    <div className="flex h-9 w-full max-w-md animate-pulse items-center justify-center gap-4 rounded-md bg-cyan-200/50" />
  );
}

export function NavbarSecondaryLinks({ items }: NavbarSecondaryLinksContentProps) {
  return (
    <Suspense fallback={<SecondaryLinksSkeleton />}>
      <NavbarSecondaryLinksContent items={items} />
    </Suspense>
  );
}
