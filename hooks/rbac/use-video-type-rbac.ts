// ============================================================
// 5. useVideoTypeRBAC - Type vidéo
// ============================================================
// hooks/rbac/use-video-type-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type VideoType =
  | "product_demo"
  | "tutorial"
  | "review"
  | "advertisement"
  | "live_stream"
  | "background";

export type VideoAction = "upload" | "edit" | "delete" | "publish" | "stream";

interface VideoTypeMetadata {
  maxDuration: number; // en secondes
  maxResolution: string;
  allowedFormats: string[];
  requiresTranscoding: boolean;
  allowedActions: VideoAction[];
  minRoleLevel: number;
  maxDailyUploads: number;
}

interface UseVideoTypeRBACReturn {
  allowed: boolean;
  metadata: VideoTypeMetadata;
  canPerform: (action: VideoAction) => boolean;
  checkDuration: (duration: number) => boolean;
  checkResolution: (width: number, height: number) => boolean;
}

const VIDEO_TYPE_CONFIG: Record<VideoType, VideoTypeMetadata> = {
  product_demo: {
    maxDuration: 300, // 5 min
    maxResolution: "1080p",
    allowedFormats: ["mp4", "mov"],
    requiresTranscoding: true,
    allowedActions: ["upload", "edit", "delete", "publish"],
    minRoleLevel: 3,
    maxDailyUploads: 10,
  },
  tutorial: {
    maxDuration: 1800, // 30 min
    maxResolution: "1080p",
    allowedFormats: ["mp4", "mov", "mkv"],
    requiresTranscoding: true,
    allowedActions: ["upload", "edit", "delete", "publish"],
    minRoleLevel: 4,
    maxDailyUploads: 5,
  },
  review: {
    maxDuration: 600, // 10 min
    maxResolution: "4K",
    allowedFormats: ["mp4", "mov", "avi"],
    requiresTranscoding: true,
    allowedActions: ["upload", "edit", "delete", "publish"],
    minRoleLevel: 3,
    maxDailyUploads: 20,
  },
  advertisement: {
    maxDuration: 60, // 1 min
    maxResolution: "4K",
    allowedFormats: ["mp4", "mov"],
    requiresTranscoding: true,
    allowedActions: ["upload", "edit", "delete", "publish"],
    minRoleLevel: 5,
    maxDailyUploads: 3,
  },
  live_stream: {
    maxDuration: 7200, // 2h
    maxResolution: "1080p",
    allowedFormats: ["rtmp", "hls"],
    requiresTranscoding: true,
    allowedActions: ["stream", "delete"],
    minRoleLevel: 5,
    maxDailyUploads: 1,
  },
  background: {
    maxDuration: 30,
    maxResolution: "720p",
    allowedFormats: ["mp4", "webm"],
    requiresTranscoding: false,
    allowedActions: ["upload", "delete"],
    minRoleLevel: 3,
    maxDailyUploads: 50,
  },
};

const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4K": { width: 3840, height: 2160 },
};

export function useVideoTypeRBAC(
  type: VideoType,
  action: VideoAction,
): UseVideoTypeRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => VIDEO_TYPE_CONFIG[type], [type]);

  const allowed = useMemo(() => {
    if (!level) return false;
    const meetsLevel = level >= config.minRoleLevel;
    const hasVideoPermission = hasPermission("media:upload");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasVideoPermission && actionAllowed;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: VideoAction): boolean => {
      if (!level) return false;
      return (
        level >= config.minRoleLevel &&
        config.allowedActions.includes(targetAction)
      );
    };
  }, [level, config]);

  const checkDuration = useMemo(() => {
    return (duration: number): boolean => {
      return duration <= config.maxDuration;
    };
  }, [config]);

  const checkResolution = useMemo(() => {
    return (width: number, height: number): boolean => {
      const maxRes = RESOLUTION_MAP[config.maxResolution];
      if (!maxRes) return true;
      return width <= maxRes.width && height <= maxRes.height;
    };
  }, [config]);

  return useMemo(
    () => ({
      allowed,
      metadata: config,
      canPerform,
      checkDuration,
      checkResolution,
    }),
    [allowed, config, canPerform, checkDuration, checkResolution],
  );
}
