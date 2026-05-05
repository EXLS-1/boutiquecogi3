// lib/format.ts
export const formatPriceUSD = (cents: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export const formatDateFR = (date: Date | string): string => {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long", // Note: La nomenclature technique reste en anglais dans le code, mais l'affichage respecte le français ici
    year: "numeric",
  }).format(new Date(date));
};
