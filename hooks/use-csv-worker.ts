// hooks/use-csv-worker.ts
// =============================================================================
// Hook — Utilisation du Web Worker CSV pour parsing progressif
// =============================================================================
// Gère la communication entre le composant React et le Web Worker
// pour le parsing de fichiers CSV volumineux.
// =============================================================================

import { useCallback, useRef, useState, useEffect } from "react";

export interface CsvChunk {
  data: Record<string, unknown>[];
  rowCount: number;
  errors: Array<{ row?: number; message: string }>;
}

export interface CsvWorkerState {
  isParsing: boolean;
  progress: number;
  totalRows: number;
  error: string | null;
  aborted: boolean;
}

export interface CsvWorkerResult {
  parseCsv: (
    file: File,
    onChunk: (chunk: CsvChunk) => void,
    onComplete: (totalRows: number) => void,
  ) => void;
  abort: () => void;
  state: CsvWorkerState;
}

export function useCsvWorker(): CsvWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<CsvWorkerState>({
    isParsing: false,
    progress: 0,
    totalRows: 0,
    error: null,
    aborted: false,
  });

// Initialisation du worker
  useEffect(() => {
    if (typeof window !== "undefined" && !workerRef.current) {
      try {
        workerRef.current = new Worker("/workers/csv-parser.js");
      } catch (err) {
        console.error("[useCsvWorker] Échec création Worker:", err);
        // On ne met pas à jour l'état ici (évite les cascading renders).
        // L'erreur sera détectée lors de l'appel à parseCsv.
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "abort" });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const parseCsv = useCallback(
    (
      file: File,
      onChunk: (chunk: CsvChunk) => void,
      onComplete: (totalRows: number) => void,
    ) => {
      const worker = workerRef.current;
      if (!worker) {
        setState((s) => ({ ...s, error: "Worker non disponible" }));
        return;
      }

      setState({
        isParsing: true,
        progress: 0,
        totalRows: 0,
        error: null,
        aborted: false,
      });

      // Lecture du fichier
      const reader = new FileReader();

      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        if (!csvContent) {
          setState((s) => ({
            ...s,
            isParsing: false,
            error: "Impossible de lire le fichier",
          }));
          return;
        }

        const handleMessage = (e: MessageEvent) => {
          const msg = e.data;

          switch (msg.type) {
            case "chunk":
              onChunk({
                data: msg.data || [],
                rowCount: msg.rowCount || 0,
                errors: msg.errors || [],
              });
              break;

            case "progress":
              setState((s) => ({
                ...s,
                totalRows: msg.totalRows || 0,
                progress: Math.min(
                  (msg.meta?.cursor / csvContent.length) * 100,
                  99,
                ),
              }));
              break;

            case "complete":
              setState((s) => ({
                ...s,
                isParsing: false,
                progress: 100,
                totalRows: msg.totalRows || 0,
              }));
              worker.removeEventListener("message", handleMessage);
              onComplete(msg.totalRows || 0);
              break;

            case "error":
              setState((s) => ({
                ...s,
                isParsing: false,
                error: msg.error || "Erreur de parsing",
              }));
              worker.removeEventListener("message", handleMessage);
              break;

            case "aborted":
              setState((s) => ({
                ...s,
                isParsing: false,
                aborted: true,
              }));
              worker.removeEventListener("message", handleMessage);
              break;
          }
        };

        worker.addEventListener("message", handleMessage);

        worker.postMessage({
          type: "parse",
          csvContent,
          config: {
            chunkSize: 1024 * 50, // 50KB chunks
          },
        });
      };

      reader.onerror = () => {
        setState((s) => ({
          ...s,
          isParsing: false,
          error: "Erreur de lecture du fichier",
        }));
      };

      reader.readAsText(file, "UTF-8");
    },
    [],
  );

  const abort = useCallback(() => {
    workerRef.current?.postMessage({ type: "abort" });
    setState((s) => ({ ...s, isParsing: false, aborted: true }));
  }, []);

  return { parseCsv, abort, state };
}

