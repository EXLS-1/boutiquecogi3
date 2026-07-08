# TODO - BetterAuth connexion (BoutiqueCOGI3)

## Étapes
- [ ] Corriger `lib/auth.ts` : retirer le `dash()` non implémenté et assurer les plugins BetterAuth valides.
- [ ] Corriger `lib/auth-clients.ts` : fournir une instance client BetterAuth réelle (importer/mapper correctement la création client) et retirer les stubs non implémentés.
- [ ] Vérifier que `hooks/use-auth-actions.ts` pointe vers un fichier existant (`@/lib/auth/client` vs `lib/auth-clients.ts`).
- [ ] Lancer `npm run lint` puis `npm run build` et corriger les erreurs TypeScript/Next.

