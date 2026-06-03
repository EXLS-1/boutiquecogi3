// lib/exchange-rate/bcc-client.ts
// Ce module extrait le taux USD/CDF depuis la BCC via 3 sources : HTML, PDF ou Excel.
// Il utilise Cheerio pour le parsing HTML, pdf-parse pour les PDF et XLSX pour les Excel.
// La fonction extractRateFromText est robuste pour éviter les faux positifs liés aux dates ou années.
// La validation des taux est assurée par exchange-rate-validator.ts pour garantir la qualité des données.

import * as cheerio from "cheerio";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { BCC_URL, REQUEST_TIMEOUT_MS } from "./exchange-rate-constants";
import { validateRate } from "./exchange-rate-validator";
import { ExchangeRate } from "./exchange-rate-types";

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Nettoie le texte en supprimant les dates et les années pour éviter les captures erronées,
 * puis extrait le premier nombre au format financier valide.
 */ export function extractRateFromText(text: string): ExchangeRate | null {
  // 1. Nettoyage dynamique des dates pour éviter les faux positifs (DD/MM/YYYY, YYYY-MM-DD)
  let cleanText = text.replace(/\d{2}[/.-]\d{2}[/.-]\d{4}/g, "");
  cleanText = cleanText.replace(/\d{4}[/.-]\d{2}[/.-]\d{2}/g, "");

  // 2. Nettoyage dynamique de l'année en cours (+/- 1 an) pour éviter le hardcoding
  const currentYear = new Date().getFullYear();
  const yearRegex = new RegExp(
    `\\b(${currentYear - 1}|${currentYear}|${currentYear + 1})\\b`,
    "g",
  );
  cleanText = cleanText.replace(yearRegex, "");

  // 3. Capture du bloc numérique financier
  const match = cleanText.match(/(\d{1,3}(?:[\s\u00A0.,]\d{3})*(?:[.,]\d+)?)/);
  if (!match) return null;

  try {
    let rawValue = match[0].replace(/[\s\u00A0]/g, ""); // Purge des espaces

    // Gestion intelligente du séparateur : Si un point ET une virgule coexistent (ex: 2.850,00)
    if (rawValue.includes(".") && rawValue.includes(",")) {
      rawValue = rawValue.replace(/\./g, "").replace(",", ".");
    }
    // Si uniquement une virgule qui fait office de décimale (ex: 2850,50)
    else if (rawValue.includes(",")) {
      rawValue = rawValue.replace(",", ".");
    }
    // Si le point est présent mais situé à 3 chiffres de la fin, c'est un point décimal (ex: 2850.50)
    // Sinon, c'est un point de millier inutile pour Prisma.Decimal (ex: 2.850)
    else if (rawValue.includes(".")) {
      const parts = rawValue.split(".");
      if (
        parts[parts.length - 1].length !== 2 &&
        parts[parts.length - 1].length !== 1
      ) {
        rawValue = rawValue.replace(/\./g, "");
      }
    }

    if (!rawValue || rawValue === ".") return null;
    return new Prisma.Decimal(rawValue);
  } catch {
    return null;
  }
}

/**
 * Parsing du contenu HTML par isolation cellulaire (TD) pour éviter les collisions de données.
 */ function parseHtml(html: string): ExchangeRate | null {
  const $ = cheerio.load(html);
  let foundRate: ExchangeRate | null = null;

  $("table tr").each((_, row) => {
    if (foundRate) return;

    const cells = $(row)
      .find("td, th")
      .map((_, el) => $(el).text().trim())
      .get();
    const concatenatedRow = cells.join(" ");
    const normalizedRow = concatenatedRow
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();

    if (
      normalizedRow.includes("USD") &&
      (normalizedRow.includes("VENDEUR") || normalizedRow.includes("INDICATIF"))
    ) {
      for (const cell of cells) {
        const rate = extractRateFromText(cell);
        if (rate && validateRate(rate)) {
          foundRate = rate;
          break;
        }
      }
    }
  });

  return foundRate;
}

async function parsePdf(buffer: Buffer): Promise<ExchangeRate | null> {
  try {
    const pdfModule = await import("pdf-parse");
    const pdf = (pdfModule as any).default ?? pdfModule;
    const data = await pdf(buffer);
    if (!data.text) return null;

    const lines = data.text.split("\n");
    for (const line of lines) {
      if (line.toUpperCase().includes("USD")) {
        const rate = extractRateFromText(line);
        if (rate && validateRate(rate)) return rate;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function parseExcel(buffer: Buffer): ExchangeRate | null {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csvData = XLSX.utils.sheet_to_csv(firstSheet);

    const lines = csvData.split("\n");
    for (const line of lines) {
      if (line.toUpperCase().includes("USD")) {
        const rate = extractRateFromText(line);
        if (rate && validateRate(rate)) return rate;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fonction unique exportée pour le scraping.
 */ export async function fetchRate(): Promise<ExchangeRate | null> {
  try {
    const response = await fetchWithTimeout(
      BCC_URL,
      { headers: { "User-Agent": "Mozilla/5.0 Boutique-COGI-Sync/1.2" } },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) return null;
    const html = await response.text();

    // Priorité 1 : Scraping HTML Direct
    const rateFromHtml = parseHtml(html);
    if (rateFromHtml) return rateFromHtml;

    // Priorité 2 : Scan des documents attachés
    const $ = cheerio.load(html);
    const links = $("a")
      .map((_, el) => $(el).attr("href"))
      .get();
    const currentYear = new Date().getFullYear().toString();

    const relevantLinks = links
      .filter(
        (l): l is string =>
          !!l && (l.includes(currentYear) || l.toLowerCase().includes("taux")),
      ) // Limite à 3 liens pour éviter un traitement trop long
      .slice(0, 3);

    for (const link of relevantLinks) {
      const url = link.startsWith("http") ? link : new URL(link, BCC_URL).href;
      const parser = url.toLowerCase().endsWith(".pdf")
        ? parsePdf
        : url.toLowerCase().match(/\.xlsx?$/)
          ? parseExcel
          : null;

      if (parser) {
        const rate = await fetchAndParse(url, parser, REQUEST_TIMEOUT_MS);
        if (rate && validateRate(rate)) return rate;
      }
    }
    return null;
  } catch (error) {
    console.error("[BCC_CLIENT_ERROR]", error);
    return null;
  }
}

async function fetchAndParse<T extends ExchangeRate | null>(
  url: string,
  parser: (b: Buffer) => T | Promise<T>,
  timeoutMs: number,
): Promise<T> {
  try {
    const res = await fetchWithTimeout(url, {}, timeoutMs);
    if (!res.ok) return null as T;
    const buffer = Buffer.from(await res.arrayBuffer());
    return await parser(buffer);
  } catch {
    return null as T;
  }
}
