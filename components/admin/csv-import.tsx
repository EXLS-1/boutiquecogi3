"use client";

// components/admin/csv-import.tsx
// =============================================================================
// CsvImport — Import massif de produits via fichier CSV
// =============================================================================
// - Choix du fichier CSV (ou template téléchargeable)
// - Option d'upload automatique des images distantes vers Supabase
// - Envoi vers /api/product/import
// - Affichage du résultat (nombre importé, erreurs, conflits SKU)
// =============================================================================

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { CSV_TEMPLATE } from "@/lib/csv/import-parser";

interface ImportResult {
  success: boolean;
  imported: number;
  imagesProcessed?: number;
  failedImages?: string[];
  products?: Array<{ id: string; sku: string; name: string }>;
}

interface ImportError {
  error: string;
  details?: Array<{ row: number; field: string; message: string }>;
  conflictingSkus?: string[];
  totalErrors?: number;
}

export function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadImages, setUploadImages] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-produits.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError({ error: "Le fichier doit être au format .csv" });
      return;
    }
    setFile(selected);
    setError(null);
    setResult(null);
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    // Simulation de progression
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 400);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadImages", String(uploadImages));

      const res = await fetch("/api/product/import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (!res.ok) {
        setError(data as ImportError);
      } else {
        setResult(data as ImportResult);
        setFile(null);
      }
    } catch {
      clearInterval(progressInterval);
      setError({ error: "Erreur réseau. Impossible de contacter le serveur." });
    } finally {
      setIsUploading(false);
    }
  }, [file, uploadImages]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Import massif CSV</h2>
          <p className="text-sm text-muted-foreground">
            Importez des produits depuis un fichier CSV
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" />
          Template
        </Button>
      </div>

      {/* Zone de drop */}
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          "border-muted-foreground/25 hover:border-muted-foreground/50",
          file && "border-solid border-border bg-muted/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        {file ? (
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB • Cliquez pour changer
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">
              Glissez-déposez ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fichier .csv uniquement • Max 2MB
            </p>
          </>
        )}
      </div>

      {/* Option upload images */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={uploadImages}
          onChange={(e) => setUploadImages(e.target.checked)}
          className="rounded border-input"
        />
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        Télécharger automatiquement les images distantes vers Supabase
      </label>

      {/* Progression */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Traitement en cours...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Bouton importer */}
      {file && !isUploading && !result && (
        <Button
          onClick={handleImport}
          className="w-full"
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Importer {file.name}
        </Button>
      )}

      {/* Succès */}
      {result?.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">
              {result.imported} produit(s) importé(s) avec succès
            </span>
          </div>
          {typeof result.imagesProcessed === "number" && (
            <p className="text-xs text-green-700">
              {result.imagesProcessed} image(s) uploadée(s)
              {result.failedImages?.length
                ? ` • ${result.failedImages.length} échec(s)`
                : ""}
            </p>
          )}
          {result.failedImages && result.failedImages.length > 0 && (
            <div className="max-h-32 overflow-y-auto text-xs text-amber-700">
              {result.failedImages.map((url, i) => (
                <p key={i} className="truncate">
                  ⚠️ {url}
                </p>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => {
              setResult(null);
              setFile(null);
            }}
          >
            Importer un autre fichier
          </Button>
        </div>
      )}

      {/* Erreurs */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">{error.error}</span>
          </div>

          {error.conflictingSkus && error.conflictingSkus.length > 0 && (
            <div>
              <p className="text-sm font-medium text-destructive mb-1">
                SKU déjà existants :
              </p>
              <div className="flex flex-wrap gap-1">
                {error.conflictingSkus.map((sku) => (
                  <span
                    key={sku}
                    className="text-xs px-2 py-1 bg-destructive/20 rounded font-mono"
                  >
                    {sku}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error.details && error.details.length > 0 && (
            <div className="max-h-48 overflow-y-auto text-xs">
              {error.details.map((d, i) => (
                <p key={i} className="py-0.5">
                  Ligne {d.row} — <strong>{d.field}</strong>: {d.message}
                </p>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setError(null)}
          >
            Compris
          </Button>
        </div>
      )}
    </div>
  );
}
