// components/product/product-sort-filter.tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createUrl } from "@/lib/utils";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronsUpDown, Check } from "lucide-react";
import clsx from "clsx";

const SORT_OPTIONS = [
  { label: "Nouveautés", value: "newest" },
  { label: "Prix : Croissant", value: "price-asc" },
  { label: "Prix : Décroissant", value: "price-desc" },
];

export function ProductSortFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "newest") {
      params.delete("sort"); // 'newest' est notre état par défaut
    } else {
      params.set("sort", value);
    }

    router.push(createUrl(pathname, params), { scroll: false });
  };

  return (
    <div className="relative flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Trier par:</span>
      <Listbox value={currentSort} onChange={handleSortChange}>
        <Listbox.Button className="flex items-center gap-1 bg-transparent border-none text-xs font-bold uppercase tracking-widest outline-none cursor-pointer focus:ring-0 hover:text-cyan-600 transition-colors">
          <span>{SORT_OPTIONS.find((o) => o.value === currentSort)?.label}</span>
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        </Listbox.Button>

        <Transition>
          <Listbox.Options className="absolute right-0 z-50 mt-2 min-w-45 overflow-hidden rounded-lg bg-white py-1 text-base shadow-xl ring-1 ring-black/5 focus:outline-none sm:text-sm transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0">
            {SORT_OPTIONS.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className="relative cursor-pointer select-none py-2.5 pl-10 pr-4 text-xs font-bold uppercase tracking-widest text-gray-700 transition-colors ui-active:bg-cyan-50 ui-active:text-cyan-700"
              >
                {({ selected }) => (
                  <>
                    <span className={clsx("block truncate", selected ? "text-cyan-600" : "font-normal")}>
                      {option.label}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </Listbox>
    </div>
  );
}
