// La Category ne contient QUE la logique de rangement
export type CategoryId =
  | "femme"
  | "homme"
  | "enfant"
  | "chaussure"
  | "sac"
  | "accessoire";

export interface Category {
  id: CategoryId;
  name: string; // "Femme"
  slug: string; // "femme"
  description: string;
  parentId?: CategoryId | null; // Pour l'arborescence (ex: "chaussure" rattachée à "femme"?)
  displayOrder: number;
}
