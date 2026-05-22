// components/search-bar.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { createUrl } from "@/lib/utils";

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
      <input
        type="text"
        placeholder="Rechercher..."
        defaultValue={searchParams.get("q")?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
        className="border-b border-cyan-200 text-cyan-700 placeholder:text-cyan-400 px-4 py-2 focus:border-cyan-500 outline-none transition-all"
      />
    </div>
  );
}
