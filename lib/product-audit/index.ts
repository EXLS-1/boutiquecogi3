// lib/product-audit/index.ts
// =============================================================================
// Barrel — Domaine Audit Produit
// =============================================================================
// Point d'entrée `@/lib/product-audit` (requis par inventory.service.ts et
// product.service.ts). Ré-exporte l'index interne pour garder un seul contrat.
export * from "./product-audit.index";
