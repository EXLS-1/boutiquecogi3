# TODO - Implémentation "Suppression de Compte" + "Registre Interne"

## Partie 1 — UI de suppression (Front-end utilisateur)
- [x] 1. Créer `components/auth/delete-account-section.tsx` — Composant client avec dialog 3 étapes
- [x] 2. Modifier `app/profile/page.tsx` — Ajouter section "Supprimer mon compte"
- [ ] 3. Modifier `components/auth/profile.tsx` — Ajouter bouton "Supprimer mon compte" (optionnel - déjà intégré via page.tsx)

## Partie 2 — Registre interne (Interface Admin)
- [x] 4. Créer `server/actions/deleted-account-admin-actions.ts` — Actions serveur admin
- [x] 5. Créer `store/admin-deleted-account-store.ts` — Store Zustand
- [x] 6. Créer `components/admin/deleted-account-table.tsx` — Tableau admin complet
- [x] 7. Créer `app/admin/accounts/deleted/page.tsx` — Page admin du registre
- [x] 8. Navigation accessible via `/admin/accounts/deleted`

## Partie 3 — Traçabilité renforcée
- [x] 9. AuditLog dans le service de restauration (via withSecurePrisma avec auditLog: true + audit log manuel dans la transaction)

