# 🎓 Comment Utiliser Cette Documentation

Bienvenue ! Ce guide vous montre comment naviguer et utiliser la documentation complète de Boutique COGI3.

---

## 📖 Où Commencer ?

### 👤 Je suis un Nouveau Développeur

1. Lire **[README.md](README.md)** (5 min)
   - Vue d'ensemble du projet
   - Installation locale
   - Technologies utilisées

2. Lire **[DOCS_INDEX.md](DOCS_INDEX.md)** (10 min)
   - Index complet de la documentation
   - Quick Start 5 minutes
   - Recherche par domaine

3. Suivre **Quick Start**: Lancer le projet localement
   ```bash
   npm install && npm run dev
   ```

### 🏗️ Je Dois Comprendre l'Architecture

1. Lire **[structure.md](structure.md)** (20-30 min)
   - Architecture en couches
   - Arborescence des fichiers
   - Patterns de code
   - Flux de données

2. Explorer le code:
   - `app/` - Pages et routes
   - `lib/` - Logique métier
   - `components/` - Composants React

### 🔗 Je Dois Implémenter une Feature

1. Lire **[structure.md - Patterns](structure.md#-patterns--conventions)** (10 min)
   - Patterns utilisés (Repository, Service, etc.)
   - Normes de code

2. Consulter la section pertinente:
   - **Produits**: `lib/services/product.service.ts`, `lib/db/repositories/product.repository.ts`
   - **Panier**: `lib/stores/cart.store.ts`, `lib/services/cart.service.ts`
   - **Commandes**: `lib/services/order.service.ts`
   - **Paiements**: `lib/cinetpay/`

3. Lire les tests et exemples pour le domaine

### 🚀 Je Vais Déployer en Production

1. Lire **[PERFORMANCE.md - Checklist](PERFORMANCE.md#-checklist-pré-production)** (15 min)
   - Vérifications avant production
   - Configurations recommandées

2. Vérifier la sécurité:
   - [PERFORMANCE.md - Sécurité](PERFORMANCE.md#-sécurité)

3. Implémenter les recommandations critiques:
   - Rate Limiting
   - Error Tracking
   - Tests automatisés

### 🤝 Je Vais Contribuer

1. Lire **[CONTRIBUTING.md](CONTRIBUTING.md)** (15 min)
   - Workflow de contribution
   - Normes de code
   - Pull Request process

2. Cloner et créer une branche:
   ```bash
   git clone https://github.com/EXLS-1/boutiquecogi3.git
   git checkout -b feature/ma-feature
   ```

---

## 🔍 Trouver Rapidement

### Par Sujet

| Sujet                    | Fichier              | Section                       |
| ------------------------ | -------------------- | ----------------------------- |
| **Architecture globale** | structure.md         | Vue d'ensemble + Arborescence |
| **Authentification**     | structure.md         | Hiérarchie d'Authentification |
| **Endpoints API**        | API.md               | Tous les endpoints            |
| **Database schema**      | prisma/schema.prisma | Modèle complet                |
| **Performance**          | PERFORMANCE.md       | Toutes les optimisations      |
| **Code standards**       | CONTRIBUTING.md      | Normes de Code                |
| **Patterns**             | structure.md         | Patterns & Conventions        |
| **Sécurité**             | PERFORMANCE.md       | Section Sécurité              |

### Par Technologie

| Tech            | Documentation                            |
| --------------- | ---------------------------------------- |
| **Next.js**     | README.md + structure.md                 |
| **Prisma**      | structure.md (Database) + PERFORMANCE.md |
| **TypeScript**  | CONTRIBUTING.md (Code Standards)         |
| **Zod**         | CONTRIBUTING.md (Validation)             |
| **Zustand**     | PERFORMANCE.md (Frontend Optimization)   |
| **Tailwind**    | README.md (Styling)                      |
| **Better-Auth** | structure.md (Authentication)            |
| **CinetPay**    | API.md (Paiements)                       |

---

## 📚 Lire la Documentation

### Format & Navigation

```
README.md (Vue d'ensemble)
    ↓
DOCS_INDEX.md (Index & Quick Start)
    ↓
    ├─→ structure.md (Architecture détaillée)
    ├─→ API.md (Endpoints)
    ├─→ CONTRIBUTING.md (Contribution)
    ├─→ PERFORMANCE.md (Optimisations)
    └─→ ANALYSIS_SUMMARY.md (Audit)
```

### Symboles Utilisés

```
✅ - Feature implémentée / OK
⚠️  - À faire / À améliorer
🔴 - Critique / Urgent
🟡 - Haute priorité
🟢 - Basse priorité
📄 - Document
🔗 - Lien externe
💡 - Conseil / Tip
```

---

## 💻 Scénarios Courants

### Scenario 1: "J'dois ajouter un endpoint API"

**Étapes:**

1. Consulter [API.md](API.md) pour voir les patterns existants
2. Lire [structure.md - API Routes](structure.md)
3. Créer le fichier dans `app/api/[endpoint]/route.ts`
4. Valider les inputs avec Zod (voir [lib/validators/](lib/validators/))
5. Appeler le service approprié (voir [lib/services/](lib/services/))
6. Retourner JSON avec statut HTTP correct
7. Documenter dans [API.md](API.md)
8. Créer PR avec description et tests

**Ressources:**

- Pattern API Route: `app/api/products/route.ts`
- Validation: `lib/validators/product.schema.ts`
- Service: `lib/services/product.service.ts`

### Scenario 2: "Le checkout ne marche pas"

**Troubleshooting:**

1. Vérifier [API.md - Checkout](API.md#️-endpoints-commandes) pour le flux
2. Vérifier [structure.md - Flux Paiement](structure.md#3-commande--paiement)
3. Vérifier les logs CinetPay
4. Vérifier que le webhook `/api/webhook/cinetpay` reçoit les données
5. Vérifier la signature webhook (voir [PERFORMANCE.md - Webhook Verification](PERFORMANCE.md#3-webhook-verification))
6. Vérifier la transaction DB (Prisma Studio: `npm run db:studio`)

**Debug:**

```bash
npm run db:studio  # UI pour explorer la DB
# Vérifier Order, Payment, OrderItem tables
```

### Scenario 3: "Je dois optimiser la performance"

**Checklist:**

1. Lire [PERFORMANCE.md](PERFORMANCE.md) en entier
2. Profiler l'app:
   - Frontend: DevTools Chrome
   - Backend: Prisma Studio query analysis
   - Database: `EXPLAIN ANALYZE` queries
3. Implémenter les optimisations pertinentes:
   - Frontend: Server Components, Image optimization, Code splitting
   - Backend: Query optimization, Pagination, Batch operations
   - Database: Indexes, Connection pooling, Soft deletes

### Scenario 4: "Je dois sécuriser l'app"

**Checklist:**

1. Lire [PERFORMANCE.md - Sécurité](PERFORMANCE.md#-sécurité)
2. Implémenter:
   - ✅ Input Validation (Zod) - Déjà fait
   - ⚠️ Rate Limiting - À ajouter
   - ✅ RBAC - Déjà implémenté
   - ✅ Webhook Verification - Déjà implémenté
   - ⚠️ Error Tracking (Sentry) - À ajouter
3. Audit de sécurité:
   - Scanner secrets: `npm install --save-dev git-secrets`
   - Vérifier variables env n'exposent pas de secrets
   - HTTPS en production

---

## 🛠️ Outils & Commands Utiles

### Development

```bash
npm run dev              # Lancer dev server
npm run build            # Build production
npm run lint             # Vérifier code quality
npm run lint:fix         # Auto-fix linting

npm run db:studio        # Prisma UI (http://localhost:5555)
npm run db:push          # Sync DB schema
npm run db:seed          # Seed données

npm run format           # Format code (Prettier)
```

### Documentation

```bash
# Ouvrir README
cat README.md

# Rechercher dans documentation
grep -r "keyword" .

# Voir structure arborescente
tree -L 3 -I 'node_modules'
```

---

## 🎯 Recommandations de Lecture

### Pour Tous

- [ ] README.md (5 min)
- [ ] DOCS_INDEX.md (10 min)

### Pour Développeurs Backend

- [ ] structure.md (30 min)
- [ ] API.md (20 min)
- [ ] PERFORMANCE.md (30 min)

### Pour Développeurs Frontend

- [ ] structure.md - Components section (15 min)
- [ ] PERFORMANCE.md - Frontend section (20 min)

### Pour DevOps/Infrastructure

- [ ] PERFORMANCE.md (45 min)
- [ ] structure.md - Deployment section (10 min)

### Pour Mainteneurs

- [ ] ANALYSIS_SUMMARY.md (20 min)
- [ ] PERFORMANCE.md - Checklist (15 min)
- [ ] CONTRIBUTING.md (20 min)

---

## ❓ FAQ

### "Où trouver [technology]?"

- **Next.js**: `app/`, `next.config.ts`
- **Prisma**: `prisma/schema.prisma`, `lib/db/`
- **TypeScript**: `tsconfig.json`, `types/`
- **Tailwind**: `tailwind.config.js`, `components/ui/`
- **Authentication**: `lib/auth/`
- **Database**: `prisma/schema.prisma`
- **API Endpoints**: `app/api/`
- **Components**: `components/`
- **Business Logic**: `lib/services/`

### "Comment ajouter une feature?"

1. Créer une branche: `git checkout -b feature/name`
2. Implémenter en suivant les patterns
3. Tester localement: `npm run dev`
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/name`
6. Créer PR sur GitHub

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour détails.

### "Je trouve pas quelque chose..."

1. Consulter [DOCS_INDEX.md](DOCS_INDEX.md) - Recherche rapide
2. Utiliser grep:
   ```bash
   grep -r "search term" . --include="*.ts" --include="*.tsx"
   ```
3. Consulter `structure.md` pour l'arborescence
4. Ouvrir une issue sur GitHub

---

## 📞 Support

- **Questions**: Ouvrir une [Discussion GitHub](https://github.com/EXLS-1/boutiquecogi3/discussions)
- **Bugs**: Créer un [Issue GitHub](https://github.com/EXLS-1/boutiquecogi3/issues)
- **Email**: contact@boutiquecogi3.com

---

## 🎓 Ressources Externes

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Better-Auth](https://better-auth.com)

---

<div align="center">

**Prêt(e) à commencer?** 🚀

[Commencer par README.md →](README.md)

</div>
