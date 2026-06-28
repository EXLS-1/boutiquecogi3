# Boutique COGI

Bienvenue sur **Boutique COGI**, une plateforme e-commerce moderne et performante, conçue pour offrir une expérience utilisateur fluide et sécurisée. Ce projet utilise les dernières technologies pour garantir robustesse, scalabilité et facilité de maintenance.

## VISION GENERALE DU PROJET

Mon projet consiste à créer une plateforme web e-commerce pour la vente de produits de mode. Basé principalement sur "NEXT.JS", la conception du site https://boutiquecogi.com/ (ayant des fonctionnalités améliorées et une interface plus moderne), va également s'appuyer sur "JAVASCRIPT + NODE.JS + REACT + REACTDOM + NEXT.JS + POSTGRESQL + PRISMA + TAILWINDCSS + BETTER-AUTH". Fermement attaché à la logique 'DRY'(Do not repeat yourself), j'ai pour devoir de veuiller à:
- rendre les pages dans 'app' aussi minimalistes que possible
- rendre les composants dans 'components' aussi atomiques que possible, réutilisables et flexibles.
- rendre la logique metier aussi claire que possible et suivant le cas dans 'lib', 'hooks' et 'store'.
- rendre le code lisible et maintenable.
- rendre le code performant et scalable et atomique.
- rendre le code sécurisé et robuste et anti-fragile.
- rendre le code modulaire.
- rendre le code testable.
- rendre le code documenté.
- rendre le code richement commenté.
- rendre le code optimisé pour le référencement (seo).
- pas de code en dur sauf pour les constantes

Le projet utilise le package 'npm' et est divisé en deux parties suivant les principes rigoureux de "Next.JS":

1. Le front-end : C'est la partie visible du site, c'est-à-dire tout ce que l'utilisateur peut voir et interagir avec.
2. Le back-end : C'est la partie invisible du site, c'est-à-dire tout ce qui se passe en arrière-plan.

Voici les differentes versions des dependances utilisées:
"dependencies": {
    "@headlessui/react": "^2.1.2",
    "@hookform/resolvers": "^5.2.2",
    "@prisma/adapter-pg": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "@radix-ui/react-checkbox": "^1.3.1",
    "@radix-ui/react-dropdown-menu": "^2.1.14",
    "@radix-ui/react-label": "^2.1.6",
    "@radix-ui/react-slot": "^1.2.2",
    "@supabase/ssr": "^0.10.3",
    "@supabase/supabase-js": "^2.108.1",
    "@tailwindcss/postcss": "^4.2.4",
    "@upstash/ratelimit": "^2.0.8",
    "@upstash/redis": "^1.38.0",
    "@zxcvbn-ts/core": "^3.0.4",
    "@zxcvbn-ts/language-common": "^3.0.4",
    "bcryptjs": "^3.0.3",
    "better-auth": "^1.6.18",
    "cheerio": "^1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.2.1",
    "dotenv": "^17.4.2",
    "embla-carousel-autoplay": "^8.6.0",
    "embla-carousel-react": "^8.6.0",
    "framer-motion": "^12.40.0",
    "immer": "^11.1.8",
    "jose": "^6.2.3",
    "lint": "^1.2.2",
    "lucide-react": "^1.18.0",
    "next": "^16.2.9",
    "next-themes": "^0.4.6",
    "nuqs": "^2.8.9",
    "pdf-parse": "^2.4.5",
    "pg": "^8.20.0",
    "radix-ui": "^1.5.0",
    "react": "^19.2.7",
    "react-aria": "^3.48.0",
    "react-dom": "^19.2.7",
    "react-hook-form": "^7.74.0",
    "react-hot-toast": "^2.6.0",
    "react-icons": "^5.6.0",
    "react-simple-typewriter": "^5.0.1",
    "select": "^1.1.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0",
    "use-debounce": "^10.1.1",
    "uuid": "^7.0.3",
    "uuidv7": "^1.2.1",
    "xlsx": "^0.18.5",
    "zod": "^4.4.3",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/pg": "^8.20.0",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@types/uuid": "^11.0.0",
    "autoprefixer": "^10.4.20",
    "babel-plugin-react-compiler": "^1.0.0",
    "eslint": "^9",
    "eslint-config-next": "^16.2.4",
    "postcss": "^8",
    "prisma": "^7.8.0",
    "supabase": "^2.98.1",
    "tailwindcss": "^4.3.1",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.22.4",
    "typescript": "^6.0.3"
  },

https://github.com/boutiquecogi/next.js-typescript-fastapi

## EBAUCHE DU PROJET
  - page.tsx
  - layout.tsx
  - global.css
  
### app
### components
### data
### hooks
### lib
### store
### types

## Fonctionnalités Clés

*   **Gestion des Produits :** Catalogue de produits structuré par catégories (femme, homme, enfant, chaussures, sacs, accessoires).
*   **Authentification Sécurisée :** Système d'authentification robuste basé sur Better-Auth, incluant la gestion des mots de passe oubliés.
*   **Panier d'Achat :** Fonctionnalité de panier pour une expérience d'achat complète.
*   **Gestion des Favoris :** Les utilisateurs peuvent sauvegarder leurs produits préférés.
*   **Journal d'Audit :** Suivi détaillé des actions administrateur pour une meilleure traçabilité et sécurité.
*   **Upload d'Images Sécurisé :** Gestion des images produits via Supabase Storage avec validation stricte.
*   **Interface Utilisateur Réactive :** Design moderne et adaptatif grâce à Tailwind CSS v4.

## Installation et Démarrage

Suivez ces étapes pour configurer et exécuter le projet en local.

### Prérequis

*   Node.js (version 18 ou supérieure recommandée)
*   npm ou Yarn
*   Une instance PostgreSQL
*   Un compte Supabase pour le stockage des images

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-utilisateur/boutiquecogi3.git
cd boutiquecogi3
```

### 2. Installer les dépendances

```bash
npm i
```

### 3. Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet et configurez les variables suivantes :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY" # Clé de rôle de service pour l'upload côté serveur

# Better-Auth (exemple, ajustez selon votre configuration)
AUTH_SECRET="YOUR_AUTH_SECRET_VERY_LONG_AND_RANDOM"
AUTH_URL="http://localhost:3000" # Ou l'URL de déploiement
```

### 4. Initialisation de la base de données

Appliquez les migrations Prisma et générez le client Prisma :

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Lancer le serveur de développement

```bash
npm run dev

```

Le projet sera accessible en développement à l'adresse `http://localhost:3000` et en production à l'adresse `https://boutiquecogi.com`.

## Structure du Projet

Pour une description détaillée de la structure des dossiers et des fichiers, veuillez consulter le fichier `structure.md`. Pour les optimisations de performance, référez-vous à `PERFORMANCE.md`.

## Contribution

Sous réserve d'acceptation par le créateur, les contributions sont les bienvenues ! Veuillez consulter les directives de contribution (à venir) pour plus d'informations.

## Licence

Ce projet est sous licence propriétaire. 