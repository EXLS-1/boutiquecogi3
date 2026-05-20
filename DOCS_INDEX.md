# 📚 Index de Documentation - Boutique COGI3

Bienvenue dans la documentation complète de **Boutique COGI3** ! Ce fichier indexe tous les documents et guides disponibles.

---

## 🚀 Pour Commencer

| Document                           | Description                                | Audience     |
| ---------------------------------- | ------------------------------------------ | ------------ |
| **[README.md](README.md)**         | Vue d'ensemble, installation, technologies | Tous         |
| **[QUICK_START.md](#quick-start)** | Guide 5 minutes pour démarrer              | Développeurs |
| **[structure.md](structure.md)**   | Architecture complète et arborescence      | Développeurs |

---

## 📖 Guides Complets

### Architecture & Design

- **[structure.md](structure.md)** (28 KB)
  - Architecture en couches
  - Arborescence détaillée avec 400+ fichiers
  - Patterns de code (Repository, Service, etc.)
  - Flux de données
  - Hiérarchie d'authentification
  - Modèle de données simplifié

### API & Intégrations

- **[API.md](API.md)** (12 KB)
  - Endpoints REST complets
  - Authentification JWT
  - Exemples cURL
  - Codes d'erreur
  - CinetPay webhook
  - Upload fichiers

### Performance & Best Practices

- **[PERFORMANCE.md](PERFORMANCE.md)** (17 KB)
  - Optimisations Frontend (Server Components, Images, Zustand)
  - Optimisations Backend (Prisma, Pagination, Transactions)
  - Database Indexing Strategy
  - Sécurité (Validation, RBAC, Webhooks)
  - Observabilité et Logging
  - Scalabilité
  - Checklist Pré-Production

### Contribution

- **[CONTRIBUTING.md](CONTRIBUTING.md)** (11 KB)
  - Workflow de contribution
  - Normes de code (TypeScript, React, API Routes)
  - Messages de commit (Conventional Commits)
  - Pull Request process
  - Tests & Documentation

---

## 🛠️ Stack Technologique

### Frontend

- **Next.js 16.2.6** - Framework React avec App Router
- **React 19.2.6** - UI components
- **TypeScript 5** - Type safety
- **Tailwind CSS v4** - Styling
- **Radix UI** - Primitives accessibles
- **Zustand 5.0** - État client
- **React Hook Form 7.74** - Formulaires
- **Zod 4.4.1** - Validation schémas

### Backend

- **Next.js API Routes** - Endpoints serverless
- **Prisma 7.8.0** - ORM TypeScript
- **PostgreSQL** - Database
- **Better-Auth 1.6.9** - Authentification
- **UUID v7** - Identifiants distribuables

### Services Externes

- **Supabase Storage** - Cloud storage images
- **CinetPay** - Paiements
- **ExchangeRate API** - Taux de change

---

## 📁 Arborescence Principale

```
boutiquecogi3/
├── 📄 README.md                 # Vue d'ensemble principale
├── 📄 structure.md              # Architecture détaillée
├── 📄 API.md                    # Documentation API
├── 📄 CONTRIBUTING.md           # Guide contribution
├── 📄 PERFORMANCE.md            # Optimisations & best practices
├── 📄 DOCS_INDEX.md             # Ce fichier
│
├── app/                         # Next.js App Router
│   ├── (store)/                 # Routes publiques store
│   ├── admin/                   # Panel administrateur
│   ├── api/                     # API Routes
│   └── layout.tsx
│
├── components/                  # Composants React
│   ├── ui/                      # Primitives Radix
│   ├── layout/                  # Navigation, footer
│   ├── products/                # Produits
│   ├── cart/                    # Panier
│   ├── checkout/                # Checkout
│   └── auth/                    # Authentification
│
├── lib/                         # Logique métier
│   ├── auth/                    # Authentification & RBAC
│   ├── db/                      # Repositories & transactions
│   ├── services/                # Services métier
│   ├── validators/              # Schémas Zod
│   ├── cinetpay/                # Intégration paiement
│   ├── utils/                   # Utilitaires
│   └── stores/                  # Zustand stores
│
├── prisma/                      # ORM
│   ├── schema.prisma            # Modèle données
│   └── migrations/              # Historique migrations
│
├── types/                       # Types TypeScript globaux
└── public/                      # Assets statiques
```

---

## 🔍 Recherche Rapide

### Par Domaine

#### Authentification

- Configuration: `lib/auth/auth.ts`
- RBAC: `lib/auth/rbac.ts`
- Server helpers: `lib/auth/server.ts`
- Client helpers: `lib/auth/auth-client.ts`
- Guide: [PERFORMANCE.md - Authentification & RBAC](PERFORMANCE.md#2-authentication--rbac)

#### Base de Données

- Schéma: `prisma/schema.prisma`
- Repositories: `lib/db/repositories/`
- Transactions: `lib/db/transactions/`
- Optimisations: [PERFORMANCE.md - Database](PERFORMANCE.md#-optimisations-base-de-données)

#### Paiements

- Client CinetPay: `lib/cinetpay/client.ts`
- Création paiement: `lib/cinetpay/create-payment.ts`
- Vérification: `lib/cinetpay/verify-payment.ts`
- Webhook: `lib/cinetpay/webhook.ts`
- Endpoint: `app/api/webhook/cinetpay/route.ts`
- Documentation: [API.md - Paiements](API.md#créer-une-transaction-de-paiement-cinetpay)

#### Produits

- Service: `lib/services/product.service.ts`
- Repository: `lib/db/repositories/product.repository.ts`
- Components: `components/products/`
- API: `app/api/products/`
- Documentation: [API.md - Produits](API.md#-endpoints-produits)

#### Panier

- Store Zustand: `lib/stores/cart.store.ts`
- Service: `lib/services/cart.service.ts`
- Components: `components/cart/`
- API: `app/api/cart/`

#### Upload Fichiers

- Service: `lib/services/upload.service.ts`
- Supabase: `lib/supabase/`
- API: `app/api/upload/`

### Par Technologie

#### Next.js

- App Router: `app/`
- API Routes: `app/api/`
- Server Components: `app/(store)/products/page.tsx`
- Dynamic imports: `components/*/`

#### Prisma

- Schema: `prisma/schema.prisma`
- Client singleton: `lib/prisma.ts`
- Migrations: `prisma/migrations/`
- Best practices: [PERFORMANCE.md - Prisma](PERFORMANCE.md#1-prisma-query-optimization)

#### TypeScript

- Types globaux: `types/`
- Types par domaine: `lib/types/`
- Validation: `lib/validators/`

#### Tailwind CSS

- Config: `tailwind.config.js`
- Styles globaux: `app/globals.css`
- Composants: `components/ui/`

---

## 🚀 Quick Start

### Installation (5 minutes)

```bash
# 1. Cloner
git clone https://github.com/EXLS-1/boutiquecogi3.git
cd boutiquecogi3

# 2. Dépendances
npm install

# 3. Configuration
cp .env.example .env.local
# Éditer .env.local avec vos credentials

# 4. Base de données
npm run db:push

# 5. Lancer
npm run dev
# Accédé à http://localhost:3000
```

### Scripts Utiles

```bash
# Développement
npm run dev              # Lancer dev server
npm run build           # Build production
npm run start           # Run production

# Linting & Format
npm run lint            # Vérifier linting
npm run lint:fix        # Corriger linting
npm run format          # Format code (Prettier)

# Base de données
npm run db:generate     # Générer Prisma Client
npm run db:push         # Appliquer migrations
npm run db:seed         # Seed données
npm run db:studio       # Prisma Studio (UI)

# Tests (à implémenter)
npm run test            # Tests unitaires
npm run test:e2e        # Tests E2E
```

---

## 📊 Modèle de Données

### Entités Principales

```
User
├─ Session (JWT)
├─ Order ──→ OrderItem ──→ ProductVariant
├─ Cart ──→ CartItem ──→ ProductVariant
├─ Address
├─ Review ──→ Product
└─ AuditLog

Product
├─ Category
├─ ProductVariant
├─ ProductImage
├─ Review
├─ InventorySnapshot
└─ InventoryTransaction

Order
├─ OrderItem
├─ Payment
├─ Shipment
└─ OrderStatusHistory
```

**Schéma complet:** Voir `prisma/schema.prisma`

---

## 🔐 Hiérarchie d'Accès

```
┌─ Guest (non connecté)
│  └─ Accès: Catalog, Home
│
└─ Authenticated
   ├─ USER role
   │  └─ Accès: Cart, Checkout, Profile, Orders
   │
   └─ ADMIN role
      └─ Accès: Dashboard, Produits, Commandes, Clients, Analytics

         └─ SUPER_ADMIN role
            └─ Accès: Tout + Settings, Audit logs
```

**Configuration:** `lib/auth/rbac.ts`

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/EXLS-1/boutiquecogi3/issues)
- **Discussions**: [GitHub Discussions](https://github.com/EXLS-1/boutiquecogi3/discussions)
- **Email**: contact@boutiquecogi3.com

---

## 🗺️ Feuille de Route

- [ ] Tests automatisés (Jest, Playwright)
- [ ] GraphQL API (alternative REST)
- [ ] Analytics temps réel
- [ ] Système de recommandations (ML)
- [ ] Support multi-devises avancé
- [ ] App mobile (React Native)
- [ ] Internationalisation (i18n)
- [ ] Intégrations Stripe/Paypal
- [ ] Webhooks avancés
- [ ] Dashboard client en temps réel

---

## 🔗 Liens Utiles

- **Accueil GitHub**: https://github.com/EXLS-1/boutiquecogi3
- **Live Demo**: https://boutiquecogi3.vercel.app
- **Docs Next.js**: https://nextjs.org/docs
- **Docs Prisma**: https://www.prisma.io/docs
- **Docs Tailwind**: https://tailwindcss.com/docs
- **Docs Better-Auth**: https://better-auth.com

---

## 📝 Versions Documentation

| Version | Date       | Notes                           |
| ------- | ---------- | ------------------------------- |
| 1.0.0   | 2024-01-20 | Documentation complète initiale |

---

<div align="center">

**Dernière mise à jour: 2024-01-20**

Made with ❤️ for African E-commerce

</div>
