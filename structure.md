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
