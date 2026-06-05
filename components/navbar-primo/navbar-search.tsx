// components/search-bar.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search } from "lucide-react";
import { createUrl } from "@/lib/utils/utils";

export function NavbarSearch() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }

    // On utilise createUrl pour conserver 'category' si elle existe
    replace(createUrl(pathname, params), { scroll: false });
  }, 300);

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-cyan-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        placeholder="Rechercher..."
        defaultValue={searchParams.get("q")?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full rounded-full border border-slate-300 bg-white/90 py-2 pl-11 pr-4 text-cyan-700 placeholder:text-cyan-400 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
      />
    </div>
  );
}
