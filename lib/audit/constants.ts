// lib/audit/constants.ts
// ============================================
// CONSTANTES DU SYSTÈME D'AUDIT
// ============================================

// Pagination
export const AUDIT_DEFAULT_LIMIT = 50;
export const AUDIT_MAX_LIMIT = 500;

// Rétention
export const AUDIT_RETENTION_DAYS = 365; // 1 an

// Performance
export const AUDIT_BATCH_SIZE = 100;
export const AUDIT_CACHE_TTL = 60; // secondes

// Sécurité
export const AUDIT_MAX_PAYLOAD_SIZE = 10000; // 10KB max pour oldValue/newValue
export const AUDIT_SANITIZE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "secret",
  "apiKey",
  "creditCard",
  "cvv",
];
