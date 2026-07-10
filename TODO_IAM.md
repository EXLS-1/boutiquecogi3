# TODO_IAM.md — Couche IAM “complète” (B)

- [ ] 1) Créer `lib/iam/resource-access.ts` (terminé)
- [ ] 2) Brancher `app/api/product-image-upload/route.ts` sur `MediaTypeConfig` (requiredPermissionUpload / minRoleLevelUpload)
- [ ] 3) Brancher `Media` / `VideoTypeConfig` upload/gestion sur `VideoTypeConfig` (requiredPermissionUpload/Moderate/Delete + minRoleLevel*)
- [ ] 4) Brancher `Category` (requiredPermission / minRoleLevel) sur endpoints/Actions admin de catégories
- [ ] 5) Brancher transitions d’ordres (`OrderStatus.requiredPermission/minRoleLevel`) sur endpoints d’évolution de statut commande
- [ ] 6) Brancher `CheckoutStep.requiredPermission/minRoleLevel` sur endpoints/Server Actions de checkout
- [ ] 7) Brancher `PaymentMethodConfig` sur config/gestion moyens de paiement
- [ ] 8) Vérifier qu’il n’y a plus de bypass `auth.api.getSession` dans les routes critiques (preférer `actionRequireAuth`/`guard`)
- [ ] 9) Vérifier que `logAudit` capture resource + resourceId pour les actions IAM critiques
- [ ] 10) Smoke tests: 401/403 attendus selon rôle/permission

