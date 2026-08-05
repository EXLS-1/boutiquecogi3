// public/workers/csv-parser.js
// =============================================================================
// Web Worker — Parsing CSV massif (> 50MB) sans freeze UI
// =============================================================================
// Ce worker utilise PapaParse en streaming via chunks pour traiter
// des fichiers CSV volumineux sans bloquer le thread principal.
// Les chunks sont envoyés progressivement au handler principal.
// =============================================================================

// Chargement de PapaParse depuis le CDN
// Note : En production, préférez importer depuis node_modules avec un bundler
importScripts("https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js");

let abortFlag = false;

self.onmessage = function (e) {
  const { type, csvContent, config } = e.data || {};

  if (type === "abort") {
    abortFlag = true;
    self.postMessage({ type: "aborted" });
    return;
  }

  if (type !== "parse") {
    self.postMessage({ type: "error", error: "Type de message inconnu" });
    return;
  }

  if (!csvContent) {
    self.postMessage({ type: "error", error: "Contenu CSV vide" });
    return;
  }

  abortFlag = false;
  let totalRows = 0;

  try {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) =>
        header.trim().toLowerCase().replace(/\s+/g, ""),

      chunk: (results, parser) => {
        if (abortFlag) {
          parser.abort();
          return;
        }

        totalRows += results.data.length;

        // Envoie le chunk au thread principal
        self.postMessage({
          type: "chunk",
          data: results.data,
          rowCount: results.data.length,
          errors: results.errors || [],
          meta: results.meta,
        });

        // Progression
        self.postMessage({
          type: "progress",
          totalRows,
          meta: results.meta,
        });
      },

      error: (error) => {
        self.postMessage({
          type: "error",
          error: error.message || "Erreur de parsing",
          row: error.row,
        });
      },

      complete: () => {
        self.postMessage({ type: "complete", totalRows });
      },

      ...config,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
};

