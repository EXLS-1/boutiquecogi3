# TODO — Workflow Produit : Cron de publication, Notifications, Preview

## Statut actuel
✅ **Toutes les étapes applicatives sont implémentées.**

- `lib/products/product-workflow.ts` — Service de workflow (transitions, règles, historique, publication programmée)
- `lib/notifications/product-notification.ts` — Notifications email + in-app (PENDING, PUBLISHED)
- `app/api/cron/publish-scheduled/route.ts` — CRON publication automatique (CRON_SECRET)
- `app/api/product/[id]/status/route.ts` — PATCH transition de statut (RBAC)
- `app/api/product/[id]/history/route.ts` — GET historique des statuts
- `app/api/product/drafts/route.ts` — GET liste des brouillons (pagination + RBAC)
- `app/api/product/[id]/preview/route.ts` — GET aperçu produit (DRAFT/PENDING/SCHEDULED)
- `components/admin/product-preview-dialog.tsx` — Dialog aperçu (réutilise ProductCard)
- `components/admin/DraftManager.tsx` — UI brouillons (soumettre/publier/programmer/archiver/aperçu/historique)
- `app/admin/product/drafts/page.tsx` — Page admin dédiée
- `lib/product-catalog/catalog-types.ts` — Ajout PENDING/SCHEDULED dans PRODUCT_STATUS_VALUES + productStatusSchema

## Vérifications
- ✅ `npx prisma generate` — Généré (Prisma Client v7.9.1)
- ✅ `npx tsc --noEmit --skipLibCheck` — Aucune erreur dans les fichiers du workflow (seules erreurs pré-existantes hors scope : 2fa/verify, redis.mock, cleanup-2fa-challenges, deleted-account-registry-service, import-parser)

## Restant (optionnel)
- [ ] `npx prisma migrate dev --name add_product_workflow` si la migration n'est pas encore appliquée en base
- [ ] `npm run build` — build de production
- [ ] Configurer le cron-job sur cron-job.org pour `/api/cron/publish-scheduled`
- [ ] Mise à jour README / doc utilisateur
