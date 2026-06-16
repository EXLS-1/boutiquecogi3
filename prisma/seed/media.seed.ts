// prisma/seed/media.seed.ts
import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import { ROLES, PERMISSIONS } from "@/lib/auth/rbac";

interface MediaTypeConfig {
  mediaType: string;
  label: string;
  description: string;
  allowedExtensions: string[];
  maxFileSize: number;
  maxDimensions: { width: number; height: number } | null;
  whoCanUpload: string[];
  whoCanDelete: string[];
  requiredPermissionUpload: string;
  requiredPermissionDelete: string;
  minRoleLevelUpload: number;
  minRoleLevelDelete: number;
  storageBucket: string;
  isPublic: boolean;
  requiresCompression: boolean;
}

const MEDIA_TYPES: MediaTypeConfig[] = [
  {
    mediaType: "PRODUCT_IMAGE", label: "Image produit",
    description: "Images associées aux produits (galerie, vignettes)",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxFileSize: 5 * 1024 * 1024,
    maxDimensions: { width: 2048, height: 2048 },
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 4, minRoleLevelDelete: 4,
    storageBucket: "products", isPublic: true, requiresCompression: true,
  },
  {
    mediaType: "PRODUCT_VIDEO", label: "Vidéo produit",
    description: "Vidéos de démonstration des produits",
    allowedExtensions: [".mp4", ".webm"],
    maxFileSize: 50 * 1024 * 1024,
    maxDimensions: { width: 1920, height: 1080 },
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 3, minRoleLevelDelete: 3,
    storageBucket: "products-videos", isPublic: true, requiresCompression: true,
  },
  {
    mediaType: "BANNER", label: "Bannière",
    description: "Images de bannières pour la page d'accueil et promotions",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    maxFileSize: 3 * 1024 * 1024,
    maxDimensions: { width: 1920, height: 600 },
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 3, minRoleLevelDelete: 2,
    storageBucket: "banners", isPublic: true, requiresCompression: true,
  },
  {
    mediaType: "CATEGORY_IMAGE", label: "Image catégorie",
    description: "Images représentatives des catégories",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxFileSize: 2 * 1024 * 1024,
    maxDimensions: { width: 800, height: 800 },
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 4, minRoleLevelDelete: 3,
    storageBucket: "categories", isPublic: true, requiresCompression: true,
  },
  {
    mediaType: "USER_AVATAR", label: "Avatar utilisateur",
    description: "Photo de profil des utilisateurs",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxFileSize: 1 * 1024 * 1024,
    maxDimensions: { width: 512, height: 512 },
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR, ROLES.SUPERVISOR, ROLES.USER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR, ROLES.SUPERVISOR, ROLES.USER],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 6, minRoleLevelDelete: 6,
    storageBucket: "avatars", isPublic: true, requiresCompression: true,
  },
  {
    mediaType: "DOCUMENT", label: "Document",
    description: "Documents administratifs (factures, rapports, CGV)",
    allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    maxFileSize: 10 * 1024 * 1024,
    maxDimensions: null,
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 3, minRoleLevelDelete: 2,
    storageBucket: "documents", isPublic: false, requiresCompression: false,
  },
  {
    mediaType: "REVIEW_IMAGE", label: "Image avis client",
    description: "Photos partagées par les clients dans leurs avis",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxFileSize: 2 * 1024 * 1024,
    maxDimensions: { width: 1024, height: 1024 },
    whoCanUpload: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR, ROLES.SUPERVISOR, ROLES.USER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    requiredPermissionUpload: PERMISSIONS.MEDIA_UPLOAD,
    requiredPermissionDelete: PERMISSIONS.MEDIA_DELETE,
    minRoleLevelUpload: 6, minRoleLevelDelete: 5,
    storageBucket: "reviews", isPublic: true, requiresCompression: true,
  },
];

interface StorageQuota {
  quotaName: string;
  label: string;
  description: string;
  maxStorageMB: number;
  maxFiles: number;
  whoCanConfigure: string[];
  minRoleLevelConfigure: number;
  appliesToRoles: string[];
}

const STORAGE_QUOTAS: StorageQuota[] = [
  {
    quotaName: "SUPER_ADMIN_QUOTA", label: "Quota Super Admin",
    description: "Stockage illimité pour les super administrateurs",
    maxStorageMB: 0, maxFiles: 0,
    whoCanConfigure: [ROLES.SUPER_ADMIN], minRoleLevelConfigure: 1,
    appliesToRoles: [ROLES.SUPER_ADMIN],
  },
  {
    quotaName: "ADMIN_QUOTA", label: "Quota Admin",
    description: "Stockage pour les administrateurs",
    maxStorageMB: 10240, maxFiles: 5000,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN], minRoleLevelConfigure: 2,
    appliesToRoles: [ROLES.ADMIN],
  },
  {
    quotaName: "MANAGER_QUOTA", label: "Quota Manager",
    description: "Stockage pour les managers",
    maxStorageMB: 5120, maxFiles: 2000,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER], minRoleLevelConfigure: 3,
    appliesToRoles: [ROLES.MANAGER],
  },
  {
    quotaName: "EDITOR_QUOTA", label: "Quota Éditeur",
    description: "Stockage pour les éditeurs de contenu",
    maxStorageMB: 2048, maxFiles: 1000,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER], minRoleLevelConfigure: 3,
    appliesToRoles: [ROLES.EDITOR],
  },
  {
    quotaName: "SUPERVISOR_QUOTA", label: "Quota Superviseur",
    description: "Stockage pour les superviseurs",
    maxStorageMB: 1024, maxFiles: 500,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER], minRoleLevelConfigure: 3,
    appliesToRoles: [ROLES.SUPERVISOR],
  },
  {
    quotaName: "USER_QUOTA", label: "Quota Utilisateur",
    description: "Stockage pour les clients",
    maxStorageMB: 256, maxFiles: 100,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER], minRoleLevelConfigure: 3,
    appliesToRoles: [ROLES.USER],
  },
];

export async function seedMediaTypes(prisma: PrismaClient) {
  console.log("🖼️  [RBAC] Configuration des types de médias...");
  for (const media of MEDIA_TYPES) {
    await prisma.mediaTypeConfig.upsert({
      where: { mediaType: media.mediaType },
      update: {
        label: media.label, description: media.description,
        allowedExtensions: media.allowedExtensions, maxFileSize: media.maxFileSize,
        maxDimensions: media.maxDimensions,
        whoCanUpload: media.whoCanUpload, whoCanDelete: media.whoCanDelete,
        requiredPermissionUpload: media.requiredPermissionUpload,
        requiredPermissionDelete: media.requiredPermissionDelete,
        minRoleLevelUpload: media.minRoleLevelUpload, minRoleLevelDelete: media.minRoleLevelDelete,
        storageBucket: media.storageBucket, isPublic: media.isPublic,
        requiresCompression: media.requiresCompression,
      },
      create: {
        id: generateUUIDv7(), mediaType: media.mediaType, label: media.label,
        description: media.description, allowedExtensions: media.allowedExtensions,
        maxFileSize: media.maxFileSize, maxDimensions: media.maxDimensions,
        whoCanUpload: media.whoCanUpload, whoCanDelete: media.whoCanDelete,
        requiredPermissionUpload: media.requiredPermissionUpload,
        requiredPermissionDelete: media.requiredPermissionDelete,
        minRoleLevelUpload: media.minRoleLevelUpload, minRoleLevelDelete: media.minRoleLevelDelete,
        storageBucket: media.storageBucket, isPublic: media.isPublic,
        requiresCompression: media.requiresCompression,
      },
    });
    console.log(f"   ✓ {media.label} [bucket:{media.storageBucket}, upload:L{media.minRoleLevelUpload}, public:{media.isPublic}]");
  }
  console.log(f"🖼️  [RBAC] {len(MEDIA_TYPES)} types de médias configurés.");
}

export async function seedStorageQuotas(prisma: PrismaClient) {
  console.log("💾 [RBAC] Configuration des quotas de stockage...");
  for (const quota of STORAGE_QUOTAS) {
    await prisma.storageQuota.upsert({
      where: { quotaName: quota.quotaName },
      update: {
        label: quota.label, description: quota.description,
        maxStorageMB: quota.maxStorageMB, maxFiles: quota.maxFiles,
        whoCanConfigure: quota.whoCanConfigure, minRoleLevelConfigure: quota.minRoleLevelConfigure,
        appliesToRoles: quota.appliesToRoles,
      },
      create: {
        id: generateUUIDv7(), quotaName: quota.quotaName, label: quota.label,
        description: quota.description, maxStorageMB: quota.maxStorageMB,
        maxFiles: quota.maxFiles, whoCanConfigure: quota.whoCanConfigure,
        minRoleLevelConfigure: quota.minRoleLevelConfigure, appliesToRoles: quota.appliesToRoles,
      },
    });
    limitText = "illimité" if quota.maxStorageMB == 0 else f"{quota.maxStorageMB}MB"
    filesText = "∞" if quota.maxFiles == 0 else str(quota.maxFiles)
    console.log(f"   ✓ {quota.label} [{limitText}, files:{filesText}, config:L{quota.minRoleLevelConfigure}]");
  }
  console.log(f"💾 [RBAC] {len(STORAGE_QUOTAS)} quotas de stockage configurés.");
}
