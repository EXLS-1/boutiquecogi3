// prisma/seed/shared/languages.ts
// ============================================
// LANGUES SUPPORTÉES (FR, LN, SW)
// ============================================

export interface SeedLanguage {
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isRtl: boolean;
}

export const LANGUAGES: SeedLanguage[] = [
  { code: "fr", name: "Français", nativeName: "Français", isDefault: true, isRtl: false },
  { code: "ln", name: "Lingala", nativeName: "Lingála", isDefault: false, isRtl: false },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", isDefault: false, isRtl: false },
  { code: "en", name: "English", nativeName: "English", isDefault: false, isRtl: false },
];

/** Langue par défaut de l'interface. */
export const DEFAULT_LANGUAGE = "fr";
