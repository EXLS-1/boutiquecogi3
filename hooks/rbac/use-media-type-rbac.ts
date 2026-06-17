// ============================================================
// 4. useMediaTypeRBAC - Type média
// ============================================================
// hooks/rbac/use-media-type-rbac.ts

"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type MediaType =
  | "image"
  | "document"
  | "audio"
  | "video"
  | "archive"
  | "3d_model";

export type MediaAction =
  | "upload"
  | "delete"
  | "organize"
  | "download"
  | "replace";

interface MediaTypeMetadata {
  maxFileSize: number;
  allowedExtensions: string[];
  bucket: string;
  requiresCompression: boolean;
  allowedActions: MediaAction[];
  minRoleLevel: number; // Plus petit = plus haut
}

interface UseMediaTypeRBACReturn {
  allowed: boolean;
  metadata: MediaTypeMetadata;
  canPerform: (action: MediaAction) => boolean;
  validateFile: (file: File) => { valid: boolean; error?: string };
}

const BYTES_PER_MB = 1024 * 1024;

const MEDIA_TYPE_CONFIG: Record<MediaType, MediaTypeMetadata> = {
  image: {
    maxFileSize: 10 * BYTES_PER_MB,
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
    bucket: "product-images",
    requiresCompression: true,
    allowedActions: ["upload", "delete", "organize", "download", "replace"],
    minRoleLevel: 5, // Seller+
  },
  document: {
    maxFileSize: 50 * BYTES_PER_MB,
    allowedExtensions: ["pdf", "doc", "docx", "txt", "xls", "xlsx"],
    bucket: "documents",
    requiresCompression: false,
    allowedActions: ["upload", "delete", "download"],
    minRoleLevel: 5,
  },
  audio: {
    maxFileSize: 100 * BYTES_PER_MB,
    allowedExtensions: ["mp3", "wav", "ogg", "aac", "flac"],
    bucket: "audio-files",
    requiresCompression: true,
    allowedActions: ["upload", "delete", "download"],
    minRoleLevel: 4, // Moderator+
  },
  video: {
    maxFileSize: 500 * BYTES_PER_MB,
    allowedExtensions: ["mp4", "mov", "avi", "mkv", "webm"],
    bucket: "video-files",
    requiresCompression: true,
    allowedActions: ["upload", "delete", "download"],
    minRoleLevel: 4,
  },
  archive: {
    maxFileSize: 200 * BYTES_PER_MB,
    allowedExtensions: ["zip", "rar", "7z", "tar", "gz"],
    bucket: "archives",
    requiresCompression: false,
    allowedActions: ["upload", "delete", "download"],
    minRoleLevel: 3, // Manager+
  },
  "3d_model": {
    maxFileSize: 100 * BYTES_PER_MB,
    allowedExtensions: ["obj", "fbx", "gltf", "glb", "stl"],
    bucket: "3d-models",
    requiresCompression: true,
    allowedActions: ["upload", "delete", "download", "replace"],
    minRoleLevel: 3,
  },
};

export function useMediaTypeRBAC(
  type: MediaType,
  action: MediaAction,
): UseMediaTypeRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => MEDIA_TYPE_CONFIG[type], [type]);

  const allowed = useMemo(() => {
    if (!level) return false;
    const meetsLevel = level <= config.minRoleLevel;
    const hasMediaPermission =
      hasPermission("media:upload") || hasPermission("media:delete");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasMediaPermission && actionAllowed;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: MediaAction): boolean => {
      if (!level) return false;
      return (
        level <= config.minRoleLevel &&
        config.allowedActions.includes(targetAction)
      );
    };
  }, [level, config]);

  const validateFile = useMemo(() => {
    return (file: File): { valid: boolean; error?: string } => {
      if (file.size > config.maxFileSize) {
        return {
          valid: false,
          error: `Fichier trop volumineux. Max: ${(config.maxFileSize / BYTES_PER_MB).toFixed(0)}MB`,
        };
      }
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !config.allowedExtensions.includes(ext)) {
        return {
          valid: false,
          error: `Extension non autorisée. Autorisées: ${config.allowedExtensions.join(", ")}`,
        };
      }
      return { valid: true };
    };
  }, [config]);

  return useMemo(
    () => ({
      allowed,
      metadata: config,
      canPerform,
      validateFile,
    }),
    [allowed, config, canPerform, validateFile],
  );
}
