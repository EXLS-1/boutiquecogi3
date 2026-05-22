// components/navbar/navbar-shell.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

type NavbarShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function NavbarShell({
  children,
  className,
}: NavbarShellProps) {
  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-16 border-b border-cyan-400 bg-slate-50",
        className
      )}
    >
      <div className="mx-auto flex h-full max-w-480 items-center justify-between px-4">
        {children}
      </div>
    </nav>
  );
}