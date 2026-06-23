// lib/currency/exchange-rate-bcc.ts
// =============================================================================
// Scraper du taux USD/CDF depuis la BCC (Banque Centrale du Congo).
// Supporte 3 formats : HTML (prioritaire), PDF, Excel (.xlsx/.xls).
// =============================================================================

import * as cheerio from "cheerio";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import {
  BCC_URL,
  REQUEST_TIMEOUT_MS,
  BCC_USER_AGENT,
} from "./exchange-rate-constants";
import { validateRate } from "../exchange-rate/exchange-rate-validator";
import { ExchangeRate } from "../exchange-rate/exchange-rate-types";

// ─── Utilitaires HTTP ───────────────────────────────────────────────────────

/**
 * Effectue une requête fetch avec timeout via AbortController.
 */
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

// ─── Extraction du taux depuis du texte brut ─────────────────────────────────

/**
 * Extrait le premier nombre financier valide d'un texte.
 * Nettoie les dates et années pour éviter les faux positifs.
 */
export function extractRateFromText(text: string): ExchangeRate | null {
  if (!text || typeof text !== "string") return null;

  // 1. Suppression des dates (DD/MM/YYYY, YYYY-MM-DD)
  let cleanText = text.replace(/\d{2}[/.-]\d{2}[/.-]\d{4}/g, "");
  cleanText = cleanText.replace(/\d{4}[/.-]\d{2}[/.-]\d{2}/g, "");

  // 2. Suppression des années courantes (±1 an)
  const currentYear = new Date().getFullYear();
  const yearRegex = new RegExp(
    `\b(${currentYear - 1}|${currentYear}|${currentYear + 1})\b`,
    "g",
  );
  cleanText = cleanText.replace(yearRegex, "");

  // 3. Capture du bloc numérique financier
  const match = cleanText.match(/(\d{1,3}(?:[\s\u00A0.,]\d{3})*(?:[.,]\d+)?)/);
  if (!match) return null;

  try {
    let rawValue = match[0].replace(/[\s\u00A0]/g, "");

    // Gestion intelligente des séparateurs
    if (rawValue.includes(".") && rawValue.includes(",")) {
      // Format européen : 2.850,00 → 2850.00
      rawValue = rawValue.replace(/\./g, "").replace(",", ".");
    } else if (rawValue.includes(",")) {
      // Virgule comme décimale : 2850,50 → 2850.50
      rawValue = rawValue.replace(",", ".");
    } else if (rawValue.includes(".")) {
      // Point : déterminer si millier ou décimal
      const parts = rawValue.split(".");
      const lastPart = parts[parts.length - 1];
      if (lastPart.length !== 1 && lastPart.length !== 2) {
        rawValue = rawValue.replace(/\./g, "");
      }
    }

    if (!rawValue || rawValue === ".") return null;
    return new Prisma.Decimal(rawValue);
  } catch {
    return null;
  }
}

// ─── Parsing HTML ───────────────────────────────────────────────────────────

/**
 * Parse le HTML de la BCC pour extraire le taux USD/CDF.
 * Recherche les lignes contenant "USD" + "VENDEUR" ou "INDICATIF".
 */
function parseHtml(html: string): ExchangeRate | null {
  const $ = cheerio.load(html);
  let foundRate: ExchangeRate | null = null;

  $("table tr").each((_, row) => {
    if (foundRate) return false; // break early

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
          return false; // break
        }
      }
    }
  });

  return foundRate;
}

// ─── Parsing PDF ────────────────────────────────────────────────────────────

async function parsePdf(buffer: Buffer): Promise<ExchangeRate | null> {
  try {
    const pdfModule = await import("pdf-parse");
    const pdf = (pdfModule as any).default ?? pdfModule;
    const data = await pdf(buffer);
    if (!data?.text) return null;

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

// ─── Parsing Excel ────────────────────────────────────────────────────────────

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

// ─── Fetch et parse générique ─────────────────────────────────────────────────

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

// ─── Fonction principale de scraping ──────────────────────────────────────────

/**
 * Récupère le taux USD/CDF depuis la BCC.
 * Stratégie : HTML direct → Documents attachés (PDF/Excel, max 3).
 * @returns Le taux extrait et validé, ou `null` en cas d'échec
 */
export async function fetchRate(): Promise<ExchangeRate | null> {
  try {
    const response = await fetchWithTimeout(
      BCC_URL,
      { headers: { "User-Agent": BCC_USER_AGENT } },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      console.warn(`[BCC_CLIENT] Réponse HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Priorité 1 : Scraping HTML Direct
    const rateFromHtml = parseHtml(html);
    if (rateFromHtml) {
      console.log(
        `[BCC_CLIENT] Taux extrait du HTML : ${rateFromHtml.toFixed()} CDF`,
      );
      return rateFromHtml;
    }

    // Priorité 2 : Scan des documents attachés (max 3 liens)
    const $ = cheerio.load(html);
    const links = $("a")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter((l): l is string => !!l);

    const currentYear = new Date().getFullYear().toString();
    const relevantLinks = links
      .filter(
        (l) => l.includes(currentYear) || l.toLowerCase().includes("taux"),
      )
      .slice(0, 3);

    for (const link of relevantLinks) {
      const url = link.startsWith("http") ? link : new URL(link, BCC_URL).href;
      const lowerUrl = url.toLowerCase();

      let parser: ((b: Buffer) => Promise<ExchangeRate | null>) | null = null;
      if (lowerUrl.endsWith(".pdf")) {
        parser = parsePdf;
      } else if (/\.xlsx?$/.test(lowerUrl)) {
        parser = parseExcel;
      }

      if (parser) {
        const rate = await fetchAndParse(url, parser, REQUEST_TIMEOUT_MS);
        if (rate && validateRate(rate)) {
          console.log(
            `[BCC_CLIENT] Taux extrait du document : ${rate.toFixed()} CDF`,
          );
          return rate;
        }
      }
    }

    console.warn("[BCC_CLIENT] Aucun taux trouvé dans les sources disponibles");
    return null;
  } catch (error) {
    console.error("[BCC_CLIENT_ERROR]", error);
    return null;
  }
}
