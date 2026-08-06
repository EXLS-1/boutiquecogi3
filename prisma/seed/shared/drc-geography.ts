// prisma/seed/shared/drc-geography.ts
// ============================================
// CARTOGRAPHIE DES PROVINCES & VILLES DE RDC
// ============================================

export interface Province {
  code: string;
  name: string;
  cities: string[];
}

export const DRC_PROVINCES: Province[] = [
  { code: "KIN", name: "Kinshasa", cities: ["Kinshasa"] },
  {
    code: "LUB",
    name: "Haut-Katanga",
    cities: ["Lubumbashi", "Likasi", "Kipushi"],
  },
  {
    code: "GOM",
    name: "Nord-Kivu",
    cities: ["Goma", "Beni", "Butembo"],
  },
  {
    code: "BUK",
    name: "Sud-Kivu",
    cities: ["Bukavu", "Uvira", "Kindu"],
  },
  {
    code: "MBJ",
    name: "Mai-Ndombe",
    cities: ["Inongo", "Kutu", "Oshwe"],
  },
  {
    code: "KIN-OU",
    name: "Kongo-Central",
    cities: ["Matadi", "Boma", "Mbanza-Ngungu"],
  },
  {
    code: "KAS",
    name: "Kasaï",
    cities: ["Kananga", "Tshikapa", "Mwene-Ditu"],
  },
  {
    code: "ORI",
    name: "Tshopo",
    cities: ["Kisangani", "Ubundu", "Isangi"],
  },
];

/** Villes de livraison supportées. */
export const SUPPORTED_CITIES: Record<string, { province: string; cities: string[] }> = {
  KIN: { province: "Kinshasa", cities: ["Kinshasa"] },
  LUB: { province: "Haut-Katanga", cities: ["Lubumbashi", "Likasi"] },
  GOM: { province: "Nord-Kivu", cities: ["Goma"] },
};

/** Communes de Kinshasa. */
export const KINSHASA_COMMUNES = [
  "Gombe",
  "Ngaliema",
  "Limete",
  "Kasa-Vubu",
  "Bandalungwa",
  "Lingwala",
  "Mont-Ngafula",
"Lemba",
  "Barumbu",
  "Kalamu",
] as const;
