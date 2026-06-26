import { Category, CategoryId } from "../types/category.types";

export const categoriesSeed: Record<CategoryId, Category> = {
  femme: {
    id: "femme",
    name: "Femme",
    slug: "femme",
    description: "Mode et élégance pour femmes",
    displayOrder: 1,
  },
  homme: {
    id: "homme",
    name: "Homme",
    slug: "homme",
    description: "Classiques et tendances hommes",
    displayOrder: 2,
  },
  enfant: {
    id: "enfant",
    name: "Enfant",
    slug: "enfant",
    description: "Confort et couleurs pour enfants",
    displayOrder: 3,
  },
  chaussure: {
    id: "chaussure",
    name: "Chaussures",
    slug: "chaussures",
    description: "Tendances pieds",
    parentId: "femme",
    displayOrder: 4,
  },
  sac: {
    id: "sac",
    name: "Sacs",
    slug: "sacs",
    description: "Accessoires de luxe",
    parentId: "femme",
    displayOrder: 5,
  },
  accessoire: {
    id: "accessoire",
    name: "Accessoires",
    slug: "accessoires",
    description: "La touche finale",
    parentId: null,
    displayOrder: 6,
  },
};
