// components/catalog/pagination.tsx
/**
 * =============================================================================
 * PAGINATION (Client Component)
 * =============================================================================
 * Pagination avec navigation URL, troncation intelligente et états actifs.
 * Nécessite "use client" pour la navigation côté client via window.location.
 */

"use client";

import Link from "next/link";
import type { SortOption } from "@/lib/product-catalog/catalog-page-types";

interface PaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly categorySlug: string;
  readonly sortBy: SortOption;
}

/**
 * Pagination avec troncation intelligente (fenêtre glissante de 5 pages).
 * @param currentPage — Page active (1-based)
 * @param totalPages — Nombre total de pages
 * @param categorySlug — Slug pour construire les URLs
 * @param sortBy — Option de tri pour préserver dans les URLs
 */
export function Pagination({
  currentPage,
  totalPages,
  categorySlug,
  sortBy,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const maxVisible = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  const visiblePages = pages.slice(startPage - 1, endPage);

  const buildUrl = (pageNum: number): string => {
    const params = new URLSearchParams();
    if (pageNum > 1) params.set("page", pageNum.toString());
    if (sortBy !== "newest") params.set("sort", sortBy);
    const query = params.toString();
    return `/${categorySlug}${query ? `?${query}` : ""}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex justify-center items-center gap-2"
    >
      {/* Previous */}
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Page précédente"
        >
          ←
        </Link>
      )}

      {/* First page + ellipsis */}
      {startPage > 1 && (
        <>
          <Link
            href={buildUrl(1)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            1
          </Link>
          {startPage > 2 && (
            <span className="px-2 text-slate-400">...</span>
          )}
        </>
      )}

      {/* Visible page window */}
      {visiblePages.map((page) => (
        <Link
          key={page}
          href={buildUrl(page)}
          className={`px-3 py-2 rounded-lg border transition-colors ${page === currentPage
              ? "bg-cyan-600 text-white border-cyan-600"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </Link>
      ))}

      {/* Last page + ellipsis */}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="px-2 text-slate-400">...</span>
          )}
          <Link
            href={buildUrl(totalPages)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next */}
      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Page suivante"
        >
          →
        </Link>
      )}
    </nav>
  );
}
