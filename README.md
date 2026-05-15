
<h1 align="center">Boutique Cogi3</h1>

<p align="center">
  Bienvenue sur Boutique Cogi3, votre destination en ligne pour des produits de qualité.
</p>

## Description du Projet

Boutique Cogi3 est une plateforme e-commerce moderne construite avec les dernières technologies. Elle vise à offrir une expérience d'achat fluide et intuitive pour les utilisateurs, tout en fournissant une gestion robuste pour les administrateurs.

## Technologies Utilisées

- **Next.js**: Framework React pour le rendu côté serveur et la génération de sites statiques.
- **React**: Bibliothèque JavaScript pour la construction d'interfaces utilisateur interactives.
- **TypeScript**: Langage de programmation qui ajoute le typage statique à JavaScript.
- **Tailwind CSS**: Framework CSS utilitaire pour un stylisme rapide et personnalisable.
- **Better-Auth**: Solution d'authentification personnalisée.
- **Prisma**: ORM (Object-Relational Mapper) pour Node.js et TypeScript.
- **Zod**: Bibliothèque de validation de schémas.
- **PostgreSQL**: Système de gestion de base de données relationnelle open source.
- **Supabase**: Plateforme de développement backend open source.
- **CinetPay**: Solution de paiement en ligne.
- **Zustand**: Bibliothèque de gestion d'état.

## Fonctionnalités Principales  

- **Authentification Utilisateur**: Inscription, connexion et gestion de profil.
- **Catalogue Produits**: Affichage des produits avec filtres et recherche.
- **Panier d'Achat**: Ajout, suppression et mise à jour des articles dans le panier.
- **Processus de Commande**: Étapes de commande sécurisées et suivi des commandes.
- **Gestion des Commandes**: Interface administrateur pour la gestion et le suivi des commandes.
- **Tableau de Bord Administrateur**: Gestion des produits, des utilisateurs et des statistiques.
- **Intégration CinetPay**: Paiements sécurisés via CinetPay.
- **Notifications**: Alertes par e-mail pour les commandes et les mises à jour de statut.

## Installation et Lancement

Pour installer et lancer le projet, suivez les étapes ci-dessous :

### Prérequis

Assurez-vous d'avoir les éléments suivants installés sur votre machine :

- Node.js (version 18 ou supérieure)
- npm ou Yarn
- Git

### Étapes d'Installation

1. **Cloner le dépôt :**

   git clone https://github.com/votre-utilisateur/boutiquecogi3.git
   cd boutiquecogi3

2. **Installer les dépendances :**

   npm install

3. **Configuration des variables d'environnement :**
   Créez un fichier `.env.local` à la racine du projet et ajoutez-y les variables d'environnement nécessaires. Un fichier `.env.example` est fourni pour référence.

   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key


4. **Lancer le serveur de développement :**
  
   npm run dev
  
Le projet devrait maintenant être accessible à l'adresse `http://localhost:3000`.


## Structure du Projet


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
│   ├── media
│   ├── video
│
├── styles
│   ├── globals.css
│   ├── utilities.css
│   └── animations.css
│
├── types
│   ├── better-auth.d.ts # Type definitions for better-auth
│   ├── order.ts # Type definitions for orders
│   ├── product.ts # Type definitions for products
│   ├── cart.ts # Type definitions for carts
│   ├── user.ts # Type definitions for users
│   ├── review.ts # Type definitions for reviews
│   ├── category.ts # Type definitions for categories
│   ├── payment.ts # Type definitions for payments
│   └── address.ts # Type definitions for addresses
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


## Contribution
```
