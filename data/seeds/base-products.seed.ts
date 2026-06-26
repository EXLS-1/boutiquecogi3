import { BaseProduct } from "../types/product.types";

// Je nettoie radicalement les 24 doublons pour n'avoir que des produits uniques (scalable)
export const baseProductsSeed: BaseProduct[] = [
  {
    id: "robe_florale",
    name: "Robe Lumineux à motif floral brillant",
    description:
      "Robe élégante avec motif étoilé, parfaite pour les occasions spéciales",
    categoryId: "femme",
    defaultImage: "/pict01.webp",
    isActive: true,
  },
  {
    id: "costume_noir",
    name: "Costume Classique Noir",
    description:
      "Costume élégant pour homme, parfait pour les occasions professionnelles",
    categoryId: "homme",
    defaultImage: "/pict02.webp",
    isActive: true,
  },
  {
    id: "robe_enfante",
    name: "Robe Colorée Enfant",
    description: "Robe confortable et colorée pour enfant",
    categoryId: "enfant",
    defaultImage: "/pict03.webp",
    isActive: true,
  },
  {
    id: "talons_noirs",
    name: "Chaussure Talons Hauts Noir",
    description: "Chaussure élégante avec talons hauts pour femme",
    categoryId: "chaussure",
    defaultImage: "/pict05.webp",
    isActive: true,
  },
  {
    id: "sac_cuir",
    name: "Sac à Main Cuir Noir",
    description: "Sac à main en cuir véritable, élégant et spacieux",
    categoryId: "sac",
    defaultImage: "/pict07.webp",
    isActive: true,
  },
  {
    id: "ceinture_cuir",
    name: "Ceinture Cuir Marron",
    description: "Ceinture en cuir véritable, accessoire incontournable",
    categoryId: "accessoire",
    defaultImage: "/pict01.webp",
    isActive: true,
  },
];
