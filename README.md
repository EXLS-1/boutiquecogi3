# Boutique COGI

Bienvenue sur **Boutique COGI**, une plateforme e-commerce moderne et performante, conçue pour offrir une expérience utilisateur fluide et sécurisée. Ce projet utilise les dernières technologies pour garantir robustesse, scalabilité et facilité de maintenance.

## Fonctionnalités Clés

*   **Gestion des Produits :** Catalogue de produits structuré par catégories (femme, homme, enfant, chaussures, sacs, accessoires).
*   **Authentification Sécurisée :** Système d'authentification robuste basé sur Better-Auth, incluant la gestion des mots de passe oubliés.
*   **Panier d'Achat :** Fonctionnalité de panier pour une expérience d'achat complète.
*   **Gestion des Favoris :** Les utilisateurs peuvent sauvegarder leurs produits préférés.
*   **Journal d'Audit :** Suivi détaillé des actions administrateur pour une meilleure traçabilité et sécurité.
*   **Upload d'Images Sécurisé :** Gestion des images produits via Supabase Storage avec validation stricte.
*   **Interface Utilisateur Réactive :** Design moderne et adaptatif grâce à Tailwind CSS v4.

## Technologies Utilisées

*   **Framework :** Next.js 16.2.6 (React)
*   **Styling :** Tailwind CSS v4
*   **Authentification :** Better-Auth
*   **Base de Données :** PostgreSQL (via Prisma ORM)
*   **ORM :** Prisma 7.8.0
*   **Stockage Fichiers :** Supabase Storage
*   **Validation de Schéma :** Zod
*   **Gestion d'État :** Zustand
*   **Paiement :** CinetPay
*   **UUID :** UUID v7 pour des identifiants uniques et ordonnables.

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
npm install
# ou
yarn install
```

### 3. Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet et configurez les variables suivantes :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

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

Le projet sera accessible à l'adresse `http://localhost:3000`.

## Structure du Projet

Pour une description détaillée de la structure des dossiers et des fichiers, veuillez consulter le fichier `structure.md`. Pour les optimisations de performance, référez-vous à `PERFORMANCE.md`.

## Contribution

Les contributions sont les bienvenues ! Veuillez consulter les directives de contribution (à venir) pour plus d'informations.

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.