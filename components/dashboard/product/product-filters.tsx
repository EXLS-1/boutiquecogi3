"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, FilterX } from "lucide-react";
import { useDebounce } from "use-debounce";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

interface ProductFiltersProps {
  categories: { id: string; name: string }[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // État local pour le champ de recherche afin de permettre une saisie fluide
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearch] = useDebounce(searchTerm, 400);

  /**
   * Met à jour les paramètres de l'URL de manière atomique
   */
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      
      // Toujours revenir à la page 1 lors d'un changement de filtre
      params.set("page", "1");

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  // Synchronisation de la recherche debouncée avec l'URL
  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (debouncedSearch !== currentSearch) {
      updateFilters({ search: debouncedSearch || null });
    }
  }, [debouncedSearch, updateFilters, searchParams]);

  const handleReset = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = searchParams.toString().length > 0 && searchParams.toString() !== "page=1";

  return (
    <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm sm:flex-row sm:items-center">
      {/* Recherche textuelle */}
      <div className="relative flex-1 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Rechercher par nom, SKU ou description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9 h-10 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary transition-all"
        />
        {searchTerm && (
          <Button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Filtre Catégorie */}
        <Select
          value={searchParams.get("category") || "all"}
          onValueChange={(v) => updateFilters({ category: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-40 h-10 bg-muted/50 border-none focus:ring-1 focus:ring-primary">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre Statut */}
        <Select
          value={searchParams.get("status") || "all"}
          onValueChange={(v) => updateFilters({ status: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-35 h-10 bg-muted/50 border-none focus:ring-1 focus:ring-primary">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="DRAFT">Brouillon</SelectItem>
            <SelectItem value="ARCHIVED">Archivé</SelectItem>
          </SelectContent>
        </Select>

        {/* Bouton de réinitialisation */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-10 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            disabled={isPending}
          >
            <FilterX className="h-4 w-4 mr-2" />
            <span className="hidden lg:inline">Réinitialiser</span>
          </Button>
        )}

        {/* Indicateur de chargement discret pour le Suspense/Transition */}
        <div 
          className={cn(
            "h-2 w-2 rounded-full bg-primary animate-pulse transition-opacity duration-300",
            isPending ? "opacity-100" : "opacity-0"
          )} 
        />
      </div>
    </div>
  );
}


/**
 * Ce composant est conçu pour être ultra-réactif en utilisant un système de "URL-first state".
 * Il synchronise les filtres directement avec les searchParams de Next.js,
 * ce qui permet de partager des vues filtrées et de conserver l'état lors du rafraîchissement de la page.
 * J'ai également intégré use-debounce (présent dans votre package-lock.json) pour éviter de surcharger la base de données Prisma lors de la saisie de texte.
### Points forts de cette implémentation :

1.  **Performance (Debouncing)** : L'utilisation de `use-debounce` sur le champ de recherche garantit que vous ne déclenchez pas une requête Prisma `findMany` à chaque frappe de clavier. Cela préserve les ressources de votre serveur et de Supabase.
2.  **Expérience Utilisateur (UX)** : L'état local du champ de recherche (`searchTerm`) assure une saisie fluide sans latence, tandis que la transition (`useTransition`) permet à React de garder l'interface réactive pendant que les données du serveur sont récupérées en arrière-plan.
3.  **Robustesse** : Le composant gère intelligemment la pagination en remettant systématiquement la page à `1` lors de l'application d'un nouveau filtre, évitant ainsi d'arriver sur une page vide (par exemple, si vous étiez à la page 10 et que le nouveau filtre ne retourne que 2 résultats).
4.  **Design "Dashboard Pro"** : Utilisation de styles Tailwind v4 avec des fonds `muted/50` et des bordures subtiles pour une esthétique moderne et épurée, cohérente avec le reste de votre application.
*/