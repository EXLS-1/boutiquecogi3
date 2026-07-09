# TODO — refactor RBAC/auth (SessionProvider, caches multi-niveaux, audit bus, BetterAuth hooks)

## Étape 1 — SessionProvider
- [x] Créer `lib/auth/session-provider.ts` encapsulant la résolution de session (sans dépendre de `auth.api.getSession()` par RBAC).

- [ ] Modifier `lib/auth/server.ts` pour utiliser le provider.
- [ ] Modifier `lib/auth/rbac.ts` pour retirer toute dépendance directe à `auth.api.getSession()`.

## Étape 2 — Caches multi-niveaux (React → Redis → Prisma)
- [ ] Identifier tous les Map en mémoire dans `lib/auth/rbac.ts` (permissions, restrictions, config).
- [ ] Introduire `lib/cache/*` avec interface + implémentations (React cache, Redis, Prisma fallback).
- [ ] Remplacer les Map par la stratégie multi-niveaux.
- [ ] Adapter `invalidateRBACCache` pour invalider Redis + invalider le niveau React.

## Étape 3 — Audit découplé via bus d’événements
- [ ] Créer `lib/events/event-bus.ts` + `lib/events/types.ts`.
- [ ] Remplacer `logAudit()` fire-and-forget par `publish()` + handler persistant vers Prisma.
- [ ] Mettre à jour `withAudit()`.

## Étape 4 — Centraliser résolution permissions
- [ ] Vérifier que `resolveAuthContext()` est la source unique.
- [ ] S’assurer que `guards`/`server actions`/`audit-approval` réutilisent la même résolution sans doublons.

## Étape 5 — BetterAuth + Prisma Adapter + hooks → événements métier
- [ ] Vérifier `lib/better-auth.ts` (prismaAdapter présent) et ajouter hooks (afterSignUp/afterSignIn/afterSignOut).
- [ ] Publier événements métier via le bus.
- [ ] Optionnel: connecter ces événements à l’audit.

## Étape 6 — QA
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Tests/scan: vérifier absence de `auth.api.getSession()` dans `lib/auth/rbac*.ts`

