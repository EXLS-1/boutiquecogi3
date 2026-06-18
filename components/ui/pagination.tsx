// components/ui/Pagination.tsx
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Ou vos propres icônes
import { getVisiblePages } from '@/lib/utils/pagination';
import { cn } from '@/lib/utils/cn';
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string; // ex: "/products"
  searchParams?: Record<string, string | number>;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages);

  const createPageUrl = (page: number | string) => {
    const params = new URLSearchParams(searchParams as Record<string, string>);
    params.set('page', page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <nav 
      role="navigation" 
      aria-label="Pagination Navigation" 
      className="flex items-center justify-center gap-2 my-8"
    >
      {/* Bouton Précédent */}
      <Link
        href={currentPage > 1 ? createPageUrl(currentPage - 1) : '#'}
        aria-disabled={currentPage <= 1}
        className={cn(
          'p-2 rounded-md border border-neutral-200 transition-colors flex items-center',
          currentPage <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-neutral-100',
        )}
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="sr-only">Précédent</span>
      </Link>

      {/* Pages numériques */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-neutral-500">
                &hellip;
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <Link
              key={page}
              href={createPageUrl(page)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'min-w-10 h-10 flex items-center justify-center rounded-md border text-sm font-medium transition-all',
                isActive
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-black',
              )}
            >
              {page}
            </Link>
          );
        })}
      </div>

      {/* Bouton Suivant */}
      <Link
        href={currentPage < totalPages ? createPageUrl(currentPage + 1) : '#'}
        aria-disabled={currentPage >= totalPages}
        className={cn(
          'p-2 rounded-md border border-neutral-200 transition-colors flex items-center',
          currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-neutral-100',
        )}
      >
        <ChevronRight className="w-5 h-5" />
        <span className="sr-only">Suivant</span>
      </Link>
    </nav>
  );
}
