# Architecture du Projet - Boutique COGI

Ce document retrace l'organisation des dossiers et la structure technique de l'application Next.js E-commerce.

## 📁 Arborescence des Dossiers

```text
boutiquecogi3/
├── app/                    # Coeur de l'application (App Router)
│   ├── actions/            # Server Actions (Logique métier côté serveur, ex: commandes)
│   ├── api/                # Endpoints API (Route Handlers, ex: upload média)
│   ├── (auth)/             # Routes liées à l'authentification (login, register)
│   ├── checkout/           # Logique du tunnel d'achat et intégration Stripe
│   └── profile/            # Gestion du compte utilisateur
├── components/             # Composants React réutilisables (UI & Logique client)
├── data/                   # Sources de données statiques (fichiers JSON)
├── docs/                   # Guides de configuration et documentation technique
├── generated/              # Code auto-généré (Client Prisma personnalisé)
├── lib/                    # Utilitaires et configurations partagées
│   ├── supabase/           # Configuration des clients Supabase (Anon & Admin)
│   ├── auth.ts             # Instance et configuration de BetterAuth
│   ├── products.ts         # Logique d'accès et de formatage des produits
│   ├── mappers/            # Fonctions de mappage pour transformer les données brutes
│   └── format-currency.ts  # Utilitaires de formatage monétaire (USD/CDF)
├── public/                 # Assets statiques accessibles publiquement
│   └── media/              # Images des produits et ressources visuelles
├── types/                  # Définitions de types TypeScript (Interfaces)
├── .env                    # Variables d'environnement locales (SECRET - non versionné)
├── .gitignore              # Configuration des fichiers exclus de Git (node_modules, .env, etc.)
├── package.json            # Manifeste du projet (Scripts et Dépendances)
├── prisma/                 # Schéma de la base de données et migrations
└── README.md               # Présentation générale du projet
```

## 🛠️ Responsabilités des Dossiers Clés

- **`app/`** : Utilise les fonctionnalités modernes de Next.js. Les fichiers `page.tsx` gèrent le rendu, tandis que `layout.tsx` définit la structure globale.
- **`lib/`** : C'est le "cerveau" de l'application. On y trouve la gestion des prix (conversion USD/CDF), la connexion à la base de données et les clients tiers.
- **`components/`** : Séparé de la logique de route pour favoriser la réutilisation. Les composants comme `ProfilePage` ou les cartes de produits y résident.
- **`generated/prisma/`** : Crucial pour la robustesse du typage. Ce dossier contient le client de base de données généré spécifiquement pour ton schéma.

## 🔐 Sécurité et Versioning

1. **Exclusion des dépendances** : Le dossier `node_modules/` est ignoré. Pour réinstaller le projet, utilisez simplement `npm install`.
2. **Protection des secrets** : Les fichiers `.env*` contenant les clés API (Stripe, Supabase, Google) ne doivent **jamais** être poussés sur le dépôt distant.
3. **Fichiers Volumineux** : Les fichiers dépassant 100 Mo (comme certains binaires de compilation dans `node_modules`) sont bloqués par les règles GitHub.

## 🚀 Flux de Données

- **Produits** : Lus depuis `data/product-data.json`, transformés et enrichis (prix, chemins d'images) via `lib/products.ts`.

- **Authentification** : Gérée par BetterAuth avec persistance dans PostgreSQL via le client Prisma.
- **Média** : Uploadés vers Supabase Storage via `app/api/upload/route.ts`.

/boutiquecogi3
│
├── app
│   ├── (store)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   │
│   │   ├── products
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── product
│   │   │   └── [id]
│   │   │       ├── page.tsx
│   │   │       ├── loading.tsx
│   │   │       ├── error.tsx
│   │   │       └── not-found.tsx
│   │   │
│   │   ├── checkout
│   │   │   ├── page.tsx
│   │   │   ├── success
│   │   │   │   └── page.tsx
│   │   │   └── cancel
│   │   │       └── page.tsx
│   │   │
│   │   ├── cart
│   │   │   └── page.tsx
│   │   │
│   │   ├── account
│   │   │   ├── page.tsx
│   │   │   ├── orders
│   │   │   │   └── page.tsx
│   │   │   └── settings
│   │   │       └── page.tsx
│   │   │
│   │   └── auth
│   │       ├── sign-in
│   │       │   └── page.tsx
│   │       ├── sign-up
│   │       │   └── page.tsx
│   │       └── forgot-password
│   │           └── page.tsx
│   │
│   ├── admin
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   │
│   │   ├── products
│   │   │   ├── page.tsx
│   │   │   ├── create
│   │   │   │   └── page.tsx
│   │   │   └── [id]
│   │   │       ├── page.tsx
│   │   │       └── edit
│   │   │           └── page.tsx
│   │   │
│   │   ├── orders
│   │   │   └── page.tsx
│   │   │
│   │   ├── customers
│   │   │   └── page.tsx
│   │   │
│   │   └── analytics
│   │       └── page.tsx
│   │
│   ├── api
│   │   ├── auth
│   │   │   └── [...all]
│   │   │       └── route.ts
│   │   │
│   │   ├── products
│   │   │   ├── route.ts
│   │   │   └── [id]
│   │   │       └── route.ts
│   │   │
│   │   ├── checkout
│   │   │   ├── create-payment
│   │   │   │   └── route.ts
│   │   │   ├── verify-payment
│   │   │   │   └── route.ts
│   │   │   └── webhook
│   │   │       └── cinetpay
│   │   │           └── route.ts
│   │   │
│   │   ├── cart
│   │   │   └── route.ts
│   │   │
│   │   ├── upload
│   │   │   └── route.ts
│   │   │
│   │   └── health
│   │       └── route.ts
│   │
│   ├── global-error.tsx
│   ├── not-found.tsx
│   ├── layout.tsx
│   ├── loading.tsx
│   └── globals.css
│
├── components
│   ├── ui
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── dialog.tsx
│   │   ├── skeleton.tsx
│   │   ├── badge.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   └── toast.tsx
│   │
│   ├── layout
│   │   ├── navbar
│   │   │   ├── navbar-shell.tsx
│   │   │   ├── navbar-brand.tsx
│   │   │   ├── navbar-links.tsx
│   │   │   ├── navbar-actions.tsx
│   │   │   └── index.tsx
│   │   │
│   │   ├── footer.tsx
│   │   ├── container.tsx
│   │   └── mobile-menu.tsx
│   │
│   ├── products
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   ├── product-list.tsx
│   │   ├── product-detail.tsx
│   │   ├── product-gallery.tsx
│   │   ├── product-price.tsx
│   │   ├── product-not-found.tsx
│   │   ├── product-form.tsx
│   │   └── product-actions.tsx
│   │
│   ├── cart
│   │   ├── cart-sheet.tsx
│   │   ├── cart-item.tsx
│   │   ├── cart-summary.tsx
│   │   └── add-to-cart-button.tsx
│   │
│   ├── checkout
│   │   ├── checkout-form.tsx
│   │   ├── payment-button.tsx
│   │   ├── payment-status.tsx
│   │   └── order-summary.tsx
│   │
│   ├── auth
│   │   ├── sign-in-form.tsx
│   │   ├── sign-up-form.tsx
│   │   ├── auth-provider.tsx
│   │   └── protected-route.tsx
│   │
│   ├── admin
│   │   ├── admin-sidebar.tsx
│   │   ├── dashboard-card.tsx
│   │   ├── orders-table.tsx
│   │   └── products-table.tsx
│   │
│   └── providers
│       ├── theme-provider.tsx
│       ├── session-provider.tsx
│       └── query-provider.tsx
│
├── lib
│   ├── auth
│   │   ├── auth.ts
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── permissions.ts
│   │   └── session.ts
│   │
│   ├── prisma
│   │   ├── client.ts
│   │   ├── extensions.ts
│   │   └── seed.ts
│   │
│   ├── db
│   │   ├── repositories
│   │   │   ├── product.repository.ts
│   │   │   ├── order.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   └── cart.repository.ts
│   │   │
│   │   └── transactions
│   │       └── order.transaction.ts
│   │
│   ├── services
│   │   ├── product.service.ts
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   ├── cart.service.ts
│   │   └── upload.service.ts
│   │
│   ├── cinetpay
│   │   ├── client.ts
│   │   ├── create-payment.ts
│   │   ├── verify-payment.ts
│   │   ├── webhook.ts
│   │   └── types.ts
│   │
│   ├── validators
│   │   ├── product.schema.ts
│   │   ├── auth.schema.ts
│   │   ├── checkout.schema.ts
│   │   ├── cart.schema.ts
│   │   └── order.schema.ts
│   │
│   ├── mappers
│   │   ├── product.mapper.ts
│   │   ├── order.mapper.ts
│   │   └── user.mapper.ts
│   │
│   ├── stores
│   │   ├── cart.store.ts
│   │   ├── ui.store.ts
│   │   ├── currency.store.ts
│   │   └── auth.store.ts
│   │
│   ├── hooks
│   │   ├── use-cart.ts
│   │   ├── use-currency.ts
│   │   ├── use-session.ts
│   │   └── use-checkout.ts
│   │
│   ├── utils
│   │   ├── currency.ts
│   │   ├── price.ts
│   │   ├── slug.ts
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   ├── pagination.ts
│   │   └── errors.ts
│   │
│   ├── constants
│   │   ├── routes.ts
│   │   ├── roles.ts
│   │   └── payment.ts
│   │
│   └── types
│       ├── product.ts
│       ├── order.ts
│       ├── auth.ts
│       └── cart.ts
│
├── prisma
│   ├── schema.prisma
│   ├── migrations
│   └── seed.ts
│
├── public
│   ├── images
│   │   ├── products
│   │   ├── banners
│   │   └── placeholders
│   │
│   ├── icons
│   └── fonts
│
├── styles
│   ├── globals.css
│   ├── utilities.css
│   └── animations.css
│
├── middleware.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── eslint.config.js
├── prettier.config.js
├── .env
├── .env.local
├── .gitignore
└── README.md
