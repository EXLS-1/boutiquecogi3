# TODO_IAM_REFACTOR

- [ ] 0) (Fait) Analyse: couplage RBAC/BetterAuth/audit + double singleton lib/better-auth.ts + caches process.
- [ ] 1) Créer une source unique BetterAuth (désactiver lib/better-auth.ts si non utilisé).
- [ ] 2) Séparer lib/auth/rbac.ts (moteur pur) et lib/auth/server.ts (guards/audit/wrappers).
- [ ] 3) Unifier l’audit : logAudit/withAudit => event, consumer persiste/stream.
- [ ] 4) Distribuer/invalider caches RBAC via event (invalidation distribuée).
- [ ] 5) Ajouter hooks BetterAuth manquants (rotation/révocation) + endpoints.
- [ ] 6) Remplacer tout bypass getSession par actionRequireAuth/guard.
- [ ] 7) Smoke tests 401/403 + tests de non-régression.

