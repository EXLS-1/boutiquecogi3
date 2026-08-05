"use client";

// components/product/ImageUploader.tsx
// =============================================================================
// ImageUploader — Upload d'images produit avec drag & drop et prévisualisation
// =============================================================================
// - Drag & drop ou clic pour sélectionner
// - JPG, PNG, WebP uniquement
// - Max 5MB par fichier
// - Upload vers /api/admin/products/upload-image
// - Prévisualisation + alt text + rangement par position
// =============================================================================

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  Upload,
  X,
  AlertCircle,
  Loader2,
  ImageIcon,
  GripVertical,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface UploadedImage {
  id: string;
  url: string;
  altText: string;
  position: number;
  file?: File;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface ImageUploaderProps {
  productName?: string;
  initialImages?: UploadedImage[];
  maxFiles?: number;
  onChange?: (images: UploadedImage[]) => void;
}

export function ImageUploader({
  productName = "produit",
  initialImages = [],
  maxFiles = 10,
  onChange,
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateImages = useCallback(
    (next: UploadedImage[]) => {
      setImages(next);
      onChange?.(next);
    },
    [onChange],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      setUploadingCount((c) => c + 1);

      // Nouvelle image en cours d'upload
      const newImage: UploadedImage = {
        id,
        url: "",
        altText: file.name.replace(/\.[^/.]+$/, ""),
        position: images.length,
        file,
        status: "uploading",
      };
      updateImages([...images, newImage]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/products/upload-image", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Échec de l'upload");
        }

        // Mise à jour de l'image avec l'URL
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? { ...img, url: data.url, status: "done" }
              : img,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? { ...img, status: "error", error: message }
              : img,
          ),
        );
      } finally {
        setUploadingCount((c) => c - 1);
      }
    },
    [images, updateImages],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);

      // Vérification du nombre max
      if (images.length + fileArray.length > maxFiles) {
        alert(`Maximum ${maxFiles} images autorisées`);
        return;
      }

      // Filtre les fichiers valides
      const validFiles = fileArray.filter((f) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
          alert(`${f.name}: type non supporté (JPG, PNG, WebP uniquement)`);
          return false;
        }
        if (f.size > 5 * 1024 * 1024) {
          alert(`${f.name}: fichier trop lourd (max 5MB)`);
          return false;
        }
        return true;
      });

      validFiles.forEach(uploadFile);
    },
    [images.length, maxFiles, uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeImage = useCallback(
    (id: string) => {
      const next = images
        .filter((img) => img.id !== id)
        .map((img, i) => ({ ...img, position: i }));
      updateImages(next);
    },
    [images, updateImages],
  );

  const updateAltText = useCallback(
    (id: string, altText: string) => {
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, altText } : img)),
      );
    },
    [],
  );

  const moveImage = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= images.length) return;
      const next = [...images];
      [next[index], next[target]] = [next[target], next[index]];
      next.forEach((img, i) => (img.position = i));
      updateImages(next);
    },
    [images, updateImages],
  );

  const getCompletedImages = useCallback(() => {
    return images
      .filter((img) => img.status === "done" && img.url)
      .map((img) => ({
        url: img.url,
        altText: img.altText || productName,
        position: img.position,
      }));
  }, [images, productName]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Images du produit</h3>
        <span className="text-xs text-muted-foreground">
          {images.length}/{maxFiles}
        </span>
      </div>

      {/* Dropzone */}
      {images.length < maxFiles && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploadingCount > 0 ? (
            <>
              <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">
                Upload de {uploadingCount} image(s)...
              </p>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isDragging
                  ? "Déposez les images ici..."
                  : "Glissez-déposez ou cliquez pour sélectionner"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP • Max 5MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Grid des images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                "relative group rounded-lg border bg-card overflow-hidden",
                image.status === "error" && "border-destructive",
              )}
            >
              {/* Image preview */}
              <div className="aspect-square relative bg-muted">
                {image.url ? (
                  <Image
                    src={image.url}
                    alt={image.altText}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}

                {/* Overlay statut */}
                {image.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xs">Upload...</span>
                  </div>
                )}
                {image.status === "done" && (
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white rounded-full p-1">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
                {image.status === "error" && (
                  <div className="absolute inset-0 bg-destructive/90 flex flex-col items-center justify-center text-destructive-foreground p-2 text-center">
                    <AlertCircle className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">{image.error}</span>
                  </div>
                )}

                {/* Bouton supprimer */}
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                  aria-label="Supprimer l'image"
                >
                  <X className="h-3 w-3" />
                </button>

                {/* Position badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-xs font-medium">
                  {image.position + 1}
                </div>
              </div>

              {/* Alt text + navigation */}
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  placeholder="Texte alternatif (SEO)"
                  value={image.altText}
                  onChange={(e) => updateAltText(image.id, e.target.value)}
                  className="w-full text-xs h-8 px-2 rounded-md border bg-background"
                  disabled={image.status === "uploading"}
                />
                <div className="flex justify-between items-center">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(index, -1)}
                      disabled={index === 0}
                      className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                      aria-label="Déplacer avant"
                    >
                      <GripVertical className="h-3 w-3 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, 1)}
                      disabled={index === images.length - 1}
                      className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                      aria-label="Déplacer après"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Helper expose */}
      <script
        dangerouslySetInnerHTML={{
          __html: `/* ImageUploader prêt (${getCompletedImages().length} images complètes) */`,
        }}
      />
    </div>
  );
}

