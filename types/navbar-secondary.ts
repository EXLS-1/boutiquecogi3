// types/navbar-secondary.ts
// Ce fichier contient les types partagés pour les composants de la barre de navigation secondaire. Il définit une interface simple pour les éléments de navigation, permettant de structurer les données de manière cohérente à travers les différents composants de la barre de navigation. Cette approche facilite la maintenance et l'évolution du code en centralisant les définitions de types.

export interface NavItem {
  label: string;
  href: string;
}

export interface NavTrigger {
  icon: React.ElementType;
  onClick: () => void;
}
