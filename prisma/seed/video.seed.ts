import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { ROLES, PERMISSIONS } from "@/lib/auth/rbac";

interface VideoTypeConfig {
  videoType: string;
  label: string;
  description: string;
  allowedFormats: string[];
  maxDuration: number;
  maxFileSize: number;
  maxResolution: string;
  whoCanUpload: string[];
  whoCanModerate: string[];
  whoCanDelete: string[];
  requiredPermissionUpload: string;
  requiredPermissionModerate: string;
  requiredPermissionDelete: string;
  minRoleLevelUpload: number;
  minRoleLevelModerate: number;
  minRoleLevelDelete: number;
  autoTranscode: boolean;
  generateThumbnails: boolean;
  isPublicByDefault: boolean;
  requiresApproval: boolean;
}

const VIDEO_TYPES: VideoTypeConfig[] = [
  {
    videoType: "PRODUCT_DEMO", label: "Démonstration produit",
    description: "Vidéos de présentation et démonstration des produits",
    allowedFormats: [".mp4", ".mov", ".webm"],
    maxDuration: 300, maxFileSize: 100 * 1024 * 1024, maxResolution: "1080p",
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanModerate: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionModerate: PERMISSIONS.CONTENT_MODERATE,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 3, minRoleLevelModerate: 5, minRoleLevelDelete: 3,
    autoTranscode: true, generateThumbnails: true,
    isPublicByDefault: true, requiresApproval: true,
  },
  {
    videoType: "TUTORIAL", label: "Tutoriel",
    description: "Vidéos tutorielles pour les clients",
    allowedFormats: [".mp4", ".mov", ".webm", ".mkv"],
    maxDuration: 1800, maxFileSize: 500 * 1024 * 1024, maxResolution: "1080p",
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR],
    whoCanModerate: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionModerate: PERMISSIONS.CONTENT_MODERATE,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 4, minRoleLevelModerate: 5, minRoleLevelDelete: 3,
    autoTranscode: true, generateThumbnails: true,
    isPublicByDefault: true, requiresApproval: true,
  },
  {
    videoType: "LIVE_STREAM", label: "Diffusion en direct",
    description: "Streams live pour événements et lancements",
    allowedFormats: [".m3u8", ".mpd"],
    maxDuration: 7200, maxFileSize: 0, maxResolution: "4K",
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanModerate: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionModerate: PERMISSIONS.CONTENT_MODERATE,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 2, minRoleLevelModerate: 3, minRoleLevelDelete: 2,
    autoTranscode: true, generateThumbnails: false,
    isPublicByDefault: true, requiresApproval: true,
  },
  {
    videoType: "REVIEW_VIDEO", label: "Vidéo avis client",
    description: "Vidéos partagées par les clients dans leurs avis",
    allowedFormats: [".mp4", ".mov", ".webm"],
    maxDuration: 120, maxFileSize: 50 * 1024 * 1024, maxResolution: "720p",
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR, ROLES.SUPERVISOR, ROLES.USER],
    whoCanModerate: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionModerate: PERMISSIONS.CONTENT_MODERATE,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 6, minRoleLevelModerate: 5, minRoleLevelDelete: 5,
    autoTranscode: true, generateThumbnails: true,
    isPublicByDefault: false, requiresApproval: true,
  },
  {
    videoType: "BRAND_CONTENT", label: "Contenu de marque",
    description: "Vidéos institutionnelles et branding",
    allowedFormats: [".mp4", ".mov", ".webm"],
    maxDuration: 600, maxFileSize: 200 * 1024 * 1024, maxResolution: "4K",
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanModerate: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionModerate: PERMISSIONS.CONTENT_MODERATE,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 2, minRoleLevelModerate: 2, minRoleLevelDelete: 2,
    autoTranscode: true, generateThumbnails: true,
    isPublicByDefault: true, requiresApproval: true,
  },
];

interface StreamingConfig {
  configName: string;
  label: string;
  description: string;
  provider: string;
  whoCanConfigure: string[];
  requiredPermission: string;
  minRoleLevel: number;
  isActive: boolean;
  settings: Record<string, unknown>;
}

const STREAMING_CONFIGS: StreamingConfig[] = [
  {
    configName: "DEFAULT_CDN", label: "CDN Principal",
    description: "Configuration du CDN pour la distribution vidéo",
    provider: "Supabase",
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermission: PERMISSIONS.SETTINGS_UPDATE,
    minRoleLevel: 2, isActive: true,
    settings: {
      bucket: "videos", region: "eu-west-3",
      cacheDuration: 86400,
      allowedOrigins: ["https://boutiquecogi3.com"],
    },
  },
  {
    configName: "TRANSCODING_PIPELINE", label: "Pipeline de transcodage",
    description: "Configuration du transcodage automatique des vidéos",
    provider: "Internal",
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermission: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevel: 2, isActive: true,
    settings: {
      resolutions: ["240p", "480p", "720p", "1080p"],
      formats: ["mp4", "webm"],
      autoGenerateThumbnails: true, thumbnailInterval: 10,
    },
  },
  {
    configName: "LIVE_STREAMING", label: "Configuration Live",
    description: "Paramètres pour les streams en direct",
    provider: "Internal",
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermission: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevel: 2, isActive: false,
    settings: {
      maxConcurrentStreams: 5, maxBitrate: 8000,
      recordingEnabled: true, recordingRetention: 30,
    },
  },
];

export async function seedVideoTypes(prisma: PrismaClient) {
  console.log("🎬 [RBAC] Configuration des types de vidéos...");
  for (const video of VIDEO_TYPES) {
    await prisma.videoTypeConfig.upsert({
      where: { videoType: video.videoType },
      update: {
        label: video.label, description: video.description,
        allowedFormats: video.allowedFormats, maxDuration: video.maxDuration,
        maxFileSize: video.maxFileSize, maxResolution: video.maxResolution,
        whoCanUpload: video.whoCanUpload, whoCanModerate: video.whoCanModerate,
        whoCanDelete: video.whoCanDelete,
        requiredPermissionUpload: video.requiredPermissionUpload,
        requiredPermissionModerate: video.requiredPermissionModerate,
        requiredPermissionDelete: video.requiredPermissionDelete,
        minRoleLevelUpload: video.minRoleLevelUpload,
        minRoleLevelModerate: video.minRoleLevelModerate,
        minRoleLevelDelete: video.minRoleLevelDelete,
        autoTranscode: video.autoTranscode,
        generateThumbnails: video.generateThumbnails,
        isPublicByDefault: video.isPublicByDefault,
        requiresApproval: video.requiresApproval,
      },
      create: {
        id: generateUUIDv7(), videoType: video.videoType, label: video.label,
        description: video.description, allowedFormats: video.allowedFormats,
        maxDuration: video.maxDuration, maxFileSize: video.maxFileSize,
        maxResolution: video.maxResolution,
        whoCanUpload: video.whoCanUpload, whoCanModerate: video.whoCanModerate,
        whoCanDelete: video.whoCanDelete,
        requiredPermissionUpload: video.requiredPermissionUpload,
        requiredPermissionModerate: video.requiredPermissionModerate,
        requiredPermissionDelete: video.requiredPermissionDelete,
        minRoleLevelUpload: video.minRoleLevelUpload,
        minRoleLevelModerate: video.minRoleLevelModerate,
        minRoleLevelDelete: video.minRoleLevelDelete,
        autoTranscode: video.autoTranscode,
        generateThumbnails: video.generateThumbnails,
        isPublicByDefault: video.isPublicByDefault,
        requiresApproval: video.requiresApproval,
      },
    });
    console.log(`   ✓ ${video.label} [upload:L${video.minRoleLevelUpload}, mod:L${video.minRoleLevelModerate}, approval:${video.requiresApproval}]`);
  }
  console.log(`🎬 [RBAC] ${VIDEO_TYPES.length} types de vidéos configurés.`);
}

export async function seedStreamingConfig(prisma: PrismaClient) {
  console.log("📡 [RBAC] Configuration du streaming...");
  for (const config of STREAMING_CONFIGS) {
    await prisma.streamingConfig.upsert({
      where: { configName: config.configName },
      update: {
        label: config.label, description: config.description,
        provider: config.provider, whoCanConfigure: config.whoCanConfigure,
        requiredPermission: config.requiredPermission, minRoleLevel: config.minRoleLevel,
        isActive: config.isActive, settings: config.settings,
      },
      create: {
        id: generateUUIDv7(), configName: config.configName, label: config.label,
        description: config.description, provider: config.provider,
        whoCanConfigure: config.whoCanConfigure,
        requiredPermission: config.requiredPermission,
        minRoleLevel: config.minRoleLevel,
        isActive: config.isActive, settings: config.settings,
      },
    });
    console.log(`   ✓ ${config.label} [provider:${config.provider}, active:${config.isActive}, config:L${config.minRoleLevel}]`);
  }
  console.log(`📡 [RBAC] ${STREAMING_CONFIGS.length} configurations de streaming synchronisées.`);
}