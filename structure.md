# Structure du Projet Boutique COGI

Ce document décrit l'organisation des fichiers et des dossiers du projet **Boutique COGI**, un e-commerce basé sur Next.js 16.2.6. L'objectif est de maintenir une structure claire, modulaire et facile à naviguer pour faciliter le développement et la maintenance.

```
boutiquecogi3/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts             # API pour l'upload sécurisé d'images vers Supabase Storage.
│   │   └── ...                      # Autres routes API (ex: paiement, gestion de stock).
│   ├── auth/
│   │   ├── forgot-password/
│   │   │   └── page.tsx             # Page de récupération de mot de passe.
│   │   └── ...                      # Autres pages d'authentification (login, register).
│   ├── auditlog/
│   │   └── page.tsx                 # Page d'administration pour visualiser les journaux d'audit.
│   ├── (main)/                      # Groupe de routes pour les pages principales (layout partagé).
│   │   ├── page.tsx                 # Page d'accueil.
│   │   ├── layout.tsx               # Layout principal de l'application.
│   │   └── ...                      # Autres pages (produits, catégories, etc.).
│   ├── globals.css                  # Styles globaux de l'application.
│   └── layout.tsx                   # Layout racine de l'application.
├── components/
│   ├── auth/
│   │   ├── admin.tsx                # Composant d'administration. 
│   │   ├── empty-orders.tsx         # Composant affiché lorsqu'il n'y a pas de commandes.
│   │   ├── forgot-password-form.tsx # Formulaire de mot de passe oublié.
│   │   ├── order-card.tsx           # Carte d'une commande.
│   │   ├── order-list.tsx           # Liste des commandes.
│   │   ├── order-container.tsx      # Conteneur pour les commandes (peut inclure order-list et order-card).
│   │   ├── profile.tsx              # Composant d'affichage du profil utilisateur.
│   │   ├── role-guard.tsx           # Composant de garde de rôle (pour la gestion des permissions).
│   │   ├── sign-in-button.tsx       # Bouton de connexion.
│   │   ├── sign-in-form.tsx         # Formulaire de connexion.
│   │   ├── sign-out-button.tsx      # Bouton de déconnexion.
│   │   ├── sign-up-button.tsx       # Bouton d'inscription.
│   │   ├── sign-up-form.tsx         # Formulaire d'inscription.
│   │   ├── signed-up-message.tsx    # Message de reussite d'inscription affiché après l'inscription.
│   │   ├── social-auth-buttons.tsx  # Boutons d'authentification sociale (Google, Facebook, etc.).
│   │   └── update-password-form.tsx  # Formulaire de mise à jour de mot de passe.
│   ├── admin/
│   │   └── audit-log-viewer.tsx     # Composant pour afficher les journaux d'audit.
│   ├── ui/                          # Composants UI génériques (shadcn/ui ou personnalisés).
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   └── ...
│   ├── toggle/
│   │   └── right-sidebar.tsx        # Composant de barre latérale droite (panier, profil, favoris).
│   └── ...                          # Autres composants réutilisables (navbar, footer, cards, etc.).
├── data/
│   └── product-data.json            # Données statiques des produits (peut être remplacé par DB).
├── lib/
│   ├── auth/                        # Configuration et utilitaires Better-Auth.
│   │   ├── auth-client.ts           # Client Better-Auth pour les composants client.
│   │   └── index.ts                 # Configuration principale de Better-Auth.
│   ├── prisma.ts                    # Instance du client Prisma.
│   ├── supabase/
│   │   └── admin.ts                 # Client Supabase Admin pour les opérations côté serveur.
│   ├── uuid.ts                      # Utilitaire pour la génération d'UUID v7.
│   └── ...                          # Autres utilitaires (helpers, constants).
├── public/
│   ├── pict01.webp                  # Images statiques des produits.
│   └── ...
├── store/
│   └── use-ui-store.ts              # Store Zustand pour la gestion de l'état de l'interface utilisateur.
├── types/
│   └── navbar-secondary.ts          # Définitions de types pour la barre de navigation secondaire.
├── .env                             # Variables d'environnement (non versionné).
├── .env.example                     # Exemple de variables d'environnement.
├── next.config.mjs                  # Configuration de Next.js.
├── package.json                     # Dépendances et scripts du projet.
├── tsconfig.json                    # Configuration TypeScript.
├── tailwind.config.ts               # Configuration de Tailwind CSS.
└── ...                              # Autres fichiers de configuration ou de documentation.
```

## Description des Dossiers Clés

*   **`app/` :** Contient toutes les routes et pages de l'application, suivant la convention de l'App Router de Next.js.
    *   **`app/api/` :** Routes API pour les interactions côté serveur (ex: upload de fichiers, logique métier).
    *   **`app/auth/` :** Pages spécifiques à l'authentification (connexion, inscription, mot de passe oublié).
    *   **`app/auditlog/` :** Pages d'administration pour la visualisation des journaux d'audit.
    *   **`app/(main)/` :** Un groupe de routes (dossier entre parenthèses) pour organiser les pages principales qui partagent un même layout, sans affecter l'URL.
*   **`components/` :** Regroupe tous les composants React réutilisables.
    *   **`components/auth/` :** Composants spécifiques à l'authentification.
    *   **`components/admin/` :** Composants pour l'interface d'administration.
    *   **`components/ui/` :** Composants d'interface utilisateur génériques, souvent basés sur shadcn/ui ou des implémentations personnalisées.
    *   **`components/toggle/` :** Composants gérant des états de bascule (ex: sidebars).
*   **`data/` :** Contient les données statiques ou mockées utilisées dans le projet. `product-data.json` est un exemple de données de produits.
*   **`lib/` :** Bibliothèque de fonctions utilitaires, configurations et clients externes.
    *   **`lib/auth/` :** Fichiers de configuration et d'intégration de Better-Auth.
    *   **`lib/prisma.ts` :** L'instance du client Prisma pour interagir avec la base de données.
    *   **`lib/supabase/` :** Configuration et client pour Supabase (principalement Supabase Storage ici).
    *   **`lib/uuid.ts` :** Fonctions pour la génération d'UUID.
*   **`public/` :** Assets statiques accessibles publiquement (images, polices, etc.).
*   **`store/` :** Fichiers de gestion d'état global avec Zustand.
*   **`types/` :** Définitions de types TypeScript pour améliorer la robustesse du code.

Cette organisation vise à séparer clairement les préoccupations, rendant le projet plus maintenable et évolutif.