// lib/exchange-rate/bcc-client.ts
// Ce module extrait le taux USD/CDF depuis la BCC via 3 sources : HTML, PDF ou Excel.

import * as cheerio from "cheerio";
import pdf from "pdf-parse";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { BCC_URL, REQUEST_TIMEOUT_MS } from "./exchange-rate-constants";
import { validateRate } from "./exchange-rate-validator";
import { ExchangeRate } from "./exchange-rate-types";

/**
 * Orchestrateur principal : tente le HTML, puis cherche des documents (PDF/Excel) si besoin.
 */
export async function fetchRate(): Promise<ExchangeRate | null> {
  try {
    const response = await fetch(BCC_URL, {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 Boutique-COGI-Sync/1.1",
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    // 1. Tentative via HTML (le plus rapide)
    const rateFromHtml = parseHtml(html);
    if (rateFromHtml && validateRate(rateFromHtml)) return rateFromHtml;

    // 2. Si échec, on cherche des liens vers des fichiers PDF ou Excel récents
    const $ = cheerio.load(html);
    const links = $("a")
      .map((_, el) => $(el).attr("href"))
      .get();

    for (const link of links) {
      const absoluteUrl = link.startsWith("http")
        ? link
        : new URL(link, BCC_URL).href;

      if (absoluteUrl.toLowerCase().endsWith(".pdf")) {
        const rate = await fetchAndParse(
          absoluteUrl,
          parsePdf,
          REQUEST_TIMEOUT_MS,
        );
        if (rate && validateRate(rate)) return rate;
      }

      if (
        absoluteUrl.toLowerCase().endsWith(".xlsx") ||
        absoluteUrl.toLowerCase().endsWith(".xls")
      ) {
        const rate = await fetchAndParse(
          absoluteUrl,
          parseExcel,
          REQUEST_TIMEOUT_MS,
        );
        if (rate && validateRate(rate)) return rate;
      }
    }

    return null;
  } catch (error) {
    console.error("[BCC_CLIENT_ERROR]", error);
    return null;
  }
}

/**
 * Helper pour extraire un nombre depuis une chaîne de caractères (format congolais/français)
 */
function extractRateFromText(text: string): ExchangeRate | null {
  const match = text.match(/(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?)/);
  if (match) {
    const cleanRate = match[0].replace(/[\s\u00A0]/g, "").replace(",", ".");
    const parsed = new Prisma.Decimal(cleanRate);
    return parsed; // Validation will happen at a higher level
  }
  return null;
}

/**
 * Parsing du contenu HTML (Tableaux indicatifs)
 */
function parseHtml(html: string): ExchangeRate | null {
  const $ = cheerio.load(html);
  let foundRate: number | null = null;

  $("table tr").each((_, row) => {
    if (foundRate) return;
    const rowText = $(row).text().toUpperCase();
    if (
      rowText.includes("USD") &&
      (rowText.includes("VENDEUR") || rowText.includes("INDICATIF"))
    ) {
      foundRate = extractRateFromText(rowText);
    }
  });

  return foundRate;
}

/**
 * Parsing de fichier PDF (Extraction de texte brut)
 */
async function parsePdf(buffer: Buffer): Promise<ExchangeRate | null> {
  const data = await pdf(buffer);
  // On cherche souvent une ligne type "USD ... 2850,00"
  return extractRateFromText(data.text);
}

/**
 * Parsing de fichier Excel
 */
function parseExcel(buffer: Buffer): ExchangeRate | null {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const csvData = XLSX.utils.sheet_to_csv(firstSheet);
  return extractRateFromText(csvData);
}

/**
 * Télécharge un binaire et applique le parser correspondant
 */
async function fetchAndParse<T extends ExchangeRate | null>(
  url: string,
  parser: (b: Buffer) => T | Promise<T>,
  timeoutMs: number,
): Promise<T> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return await parser(buffer);
  } catch {
    return null;
  }
}

/**
 * Extrait de manière défensive le taux de change indicatif/vendeur depuis le site officiel de la BCC.
 * @returns Le taux extrait valide, ou null en cas d'anomalie ou d'indisponibilité.
 * @deprecated Utiliser fetchRate() pour une meilleure robustesse multi-source.
 */
export async function fetchRateFromBCC(): Promise<number | null> {
  return fetchRate();
}
