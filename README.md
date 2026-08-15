# Boutique COGI

Bienvenue sur **Boutique COGI**, une plateforme e-commerce moderne et performante, conçue pour offrir une expérience utilisateur fluide et sécurisée. Ce projet utilise les dernières technologies pour garantir robustesse, scalabilité et facilité de maintenance.

## VISION GENERALE DU PROJET

Mon projet consiste à créer une plateforme web e-commerce pour la vente de produits de mode. Basé principalement sur "NEXT.JS", la conception du site <https://boutiquecogi.com/> (ayant des fonctionnalités améliorées et une interface plus moderne), va également s'appuyer sur "JAVASCRIPT + NODE.JS + REACT + REACTDOM + NEXT.JS + POSTGRESQL + PRISMA + TAILWINDCSS + BETTER-AUTH". Fermement attaché à la logique 'DRY'(Do not repeat yourself), j'ai pour devoir de veuiller à:

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
- Corriger les erreurs TypeScript existantes
-Corriger les erreurs de typage et de compilation dans le projet

Le projet utilise le package 'npm' et est divisé en deux parties suivant les principes rigoureux de "Next.JS":

1. Le front-end : C'est la partie visible du site, c'est-à-dire tout ce que l'utilisateur peut voir et interagir avec.
2. Le back-end : C'est la partie invisible du site, c'est-à-dire tout ce qui se passe en arrière-plan.

Voici les differentes versions des dependances utilisées:
"dependencies": {
    "@better-auth/infra": "^0.3.7",
    "@headlessui/react": "^2.2.10",
    "@hookform/resolvers": "^5.7.1",
    "@prisma/adapter-pg": "^7.9.1",
    "@prisma/client": "^7.9.1",
    "@radix-ui/react-checkbox": "^1.3.11",
    "@radix-ui/react-dropdown-menu": "^2.1.24",
    "@radix-ui/react-label": "^2.1.15",
    "@radix-ui/react-slot": "^1.3.3",
    "@supabase/ssr": "^0.10.3",
    "@supabase/supabase-js": "^2.112.2",
    "@tailwindcss/postcss": "^4.3.3",
    "@types/papaparse": "^5.5.2",
    "@upstash/ratelimit": "^2.0.8",
    "@upstash/redis": "^1.38.2",
    "@zxcvbn-ts/core": "^3.0.4",
    "@zxcvbn-ts/language-common": "^3.0.4",
    "bcryptjs": "^3.0.3",
    "better-auth": "^1.6.26",
    "browser-image-compression": "^2.0.2",
    "cheerio": "^1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.4.0",
    "dotenv": "^17.4.2",
    "embla-carousel-autoplay": "^8.6.0",
    "embla-carousel-react": "^8.6.0",
    "exceljs": "^4.4.0",
    "framer-motion": "^12.43.0",
    "generate-password": "^1.7.1",
    "immer": "^11.1.16",
    "ioredis": "^5.11.1",
    "jose": "^6.2.8",
    "lint": "^1.2.2",
    "lucide-react": "^1.31.0",
    "nanoid": "^6.0.1",
    "next": "^16.3.0",
    "next-themes": "^0.4.6",
    "nuqs": "^2.9.5",
    "papaparse": "^5.5.4",
    "pdf-parse": "^2.4.5",
    "pg": "^8.23.0",
    "qrcode": "^1.5.4",
    "radix-ui": "^1.6.7",
    "react": "^19.2.8",
    "react-aria": "^3.51.0",
    "react-dom": "^19.2.8",
    "react-hook-form": "^7.85.0",
    "react-hot-toast": "^2.6.0",
    "react-icons": "^5.7.0",
    "react-simple-typewriter": "^5.0.1",
    "redis": "^6.2.0",
    "select": "^1.1.2",
    "sonner": "^2.0.8",
    "speakeasy": "^2.0.0",
    "swr": "^2.5.0",
    "tailwind-merge": "^3.6.0",
    "tw-animate-css": "^1.4.0",
    "use-debounce": "^10.1.1",
    "uuid": "^14.0.1",
    "uuidv7": "^1.2.1",
    "zod": "^4.4.3",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.4",
    "@types/bcryptjs": "^2.4.6",
    "@types/ioredis": "^4.28.10",
    "@types/node": "^20.19.43",
    "@types/pg": "^8.21.0",
    "@types/qrcode": "^1.5.6",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@types/speakeasy": "^2.0.10",
    "@types/uuid": "^11.0.0",
    "autoprefixer": "^10.5.4",
    "babel-plugin-react-compiler": "^1.0.0",
    "eslint": "^9.39.5",
    "eslint-config-next": "^16.3.0",
    "jsdom": "^30.0.1",
    "postcss": "^8.5.26",
    "prisma": "^7.9.1",
    "supabase": "^2.113.0",
    "tailwindcss": "^4.3.3",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.23.12",
    "typescript": "^6.0.3",
    "vitest": "^4.1.10"
  },
  
<https://github.com/boutiquecogi/next.js-typescript-fastapi>

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

- **Gestion des Produits :** Catalogue de produits structuré par catégories (femme, homme, enfant, chaussures, sacs, accessoires).
- **Authentification Sécurisée :** Système d'authentification robuste basé sur Better-Auth, incluant la gestion des mots de passe oubliés.
- **Panier d'Achat :** Fonctionnalité de panier pour une expérience d'achat complète.
- **Gestion des Favoris :** Les utilisateurs peuvent sauvegarder leurs produits préférés.
- **Journal d'Audit :** Suivi détaillé des actions administrateur pour une meilleure traçabilité et sécurité.
- **Upload d'Images Sécurisé :** Gestion des images produits via Supabase Storage avec validation stricte.
- **Interface Utilisateur Réactive :** Design moderne et adaptatif grâce à Tailwind CSS v4.

## Installation et Démarrage

Suivez ces étapes pour configurer et exécuter le projet en local.

### Prérequis

- Node.js (version 18 ou supérieure recommandée)
- npm
- Une instance PostgreSQL
- Un compte Supabase pour le stockage des images

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

> Pour une installation PostgreSQL locale sur Windows, vous pouvez utiliser `winget` ou `choco`.
>
> - `winget install --id PostgreSQL.PostgreSQL.18 -e --accept-package-agreements --accept-source-agreements`
> - Si `winget` n’est pas disponible ou si vous préférez Chocolatey, ouvrez PowerShell en administrateur puis exécutez : `choco install postgresql18 --yes`
>
> Après installation, vérifiez :
>
> - `psql --version`
> - `Get-Service -Name postgresql*`
>
> Si vous souhaitez utiliser WSL, installez d’abord WSL (`wsl --install`), puis dans la distribution Ubuntu :
>
> ```bash
> sudo apt update
> sudo apt install postgresql postgresql-contrib
> sudo service postgresql start
> ```

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

| Level | Rôle         | Description                   |
| ----- | ------------ | ----------------------------- |
| 1     | SUPER\_ADMIN | Contrôle absolu               |
| 2     | ADMIN        | Administration générale       |
| 3     | MANAGER      | Gestion équipes et opérations |
| 4     | EDITOR       | Gestion contenu et produits   |
| 5     | SUPERVISOR   | Supervision commandes         |
| 6     | USER         | Acheteur privilégié           |
| 7     | GUEST        | Visiteur non authentifié      |
