// lib/utils/pagination.ts

/**
 * Génère un tableau de numéros de page avec des ellipses pour la navigation.
 */
export function getVisiblePages(
  currentPage: number,
  totalPages: number,
): (number | string)[] {
  const neighbors = 1; // Nombre de pages à afficher autour de la page courante

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Cas 1 : Proche du début
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  // Cas 2 : Proche de la fin
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // Cas 3 : Au milieu
  return [
    1,
    "...",
    currentPage - neighbors,
    currentPage,
    currentPage + neighbors,
    "...",
    totalPages,
  ];
}
