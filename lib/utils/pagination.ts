// lib/utils/pagination.ts

export interface PaginationOptions {
  neighbors?: number;
}

/**
 * Génère un tableau de numéros de page avec ellipses pour la pagination.
 * Garantit la sécurité des bornes et l'absence de doublons.
 */
export function getVisiblePages(
  currentPage: number,
  totalPages: number,
  options: PaginationOptions = {}
): (number | string)[] {
  const { neighbors = 1 } = options;

  // Assainissement des entrées
  const total = Math.max(0, Math.floor(Number(totalPages) || 0));
  if (total <= 0) return [];

  const current = Math.max(1, Math.min(Math.floor(Number(currentPage) || 1), total));
  const safeNeighbors = Math.max(1, Math.floor(neighbors));

  // Affichage complet si le nombre total de pages est faible
  const maxVisibleWithoutEllipsis = safeNeighbors * 2 + 5; // ex: 1 + 2 + 5 = 7
  if (total <= maxVisibleWithoutEllipsis) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftThreshold = safeNeighbors + 3;
  const rightThreshold = total - (safeNeighbors + 2);

  // Cas 1 : Proche du début
  if (current <= leftThreshold) {
    const headLength = safeNeighbors * 2 + 3;
    const pages: (number | string)[] = Array.from({ length: headLength }, (_, i) => i + 1);
    return [...pages, "...", total];
  }

  // Cas 2 : Proche de la fin
  if (current >= rightThreshold) {
    const tailLength = safeNeighbors * 2 + 3;
    const startPage = total - tailLength + 1;
    const pages = Array.from({ length: tailLength }, (_, i) => startPage + i);
    return [1, "...", ...pages];
  }

  // Cas 3 : Au milieu
  const middleStart = current - safeNeighbors;
  const middleLength = safeNeighbors * 2 + 1;
  const middlePages = Array.from({ length: middleLength }, (_, i) => middleStart + i);

  return [1, "...", ...middlePages, "...", total];
}