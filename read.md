# Plan complet du projet — Boutique COGI3

> Document de référence : vision, architecture, état actuel, écarts et feuille de route détaillée.  
> Dernière mise à jour : mai 2026 — aligné sur le dépôt `boutiquecogi3`.

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Contexte et vision](#2-contexte-et-vision)
3. [Objectifs et périmètre](#3-objectifs-et-périmètre)
4. [Personas et parcours utilisateurs](#4-personas-et-parcours-utilisateurs)
5. [Stack technique](#5-stack-technique)
6. [Architecture cible](#6-architecture-cible)
7. [État actuel du dépôt](#7-état-actuel-du-dépôt)
8. [Analyse des écarts (cible vs réel)](#8-analyse-des-écarts-cible-vs-réel)
9. [Modèle de données](#9-modèle-de-données)
10. [Modules fonctionnels détaillés](#10-modules-fonctionnels-détaillés)
11. [Flux métier principaux](#11-flux-métier-principaux)
12. [API et intégrations](#12-api-et-intégrations)
13. [Sécurité et conformité](#13-sécurité-et-conformité)
14. [Configuration et environnement](#14-configuration-et-environnement)
15. [Feuille de route par phases](#15-feuille-de-route-par-phases)
16. [Critères de succès et KPIs](#16-critères-de-succès-et-kpis)
17. [Risques et mitigations](#17-risques-et-mitigations)
18. [Annexes](#18-annexes)

---

## 1. Résumé exécutif

**Boutique COGI3** est une plateforme e-commerce de mode (vêtements, accessoires, chaussures, sacs) orientée vers le marché congolais (RDC), avec support **USD** et **CDF**, paiement mobile via **CinetPay**, et back-office administrateur.

Le projet repose sur **Next.js 16.2.6** (App Router), **React 19**, **TypeScript**, **Prisma 7.8.0** + **PostgreSQL**, **Better Auth** pour l’authentification (sans Supabase Auth), **Supabase Storage** pour le stockage média, et **Zustand** pour l’état client.

**Situation actuelle :** L'architecture robuste est en place. L'implémentation des UUID v7 est généralisée. Le flux CinetPay est en cours de finalisation avec une logique d'idempotence stricte.

---

## 2. Contexte et vision

### 2.1 Contexte métier

- **Marque :** Boutique COGI — mode féminine, masculine, enfant, sacs, chaussures, accessoires.
- **Zone :** Kinshasa et RDC en priorité (adresses avec `commune`, `city` par défaut Kinshasa, `country` RDC dans le schéma).
- **Devises :** affichage et paiement en **USD** et/ou **CDF** (taux de change via API ou taux fixe en développement).
- **Paiement :** **CinetPay** (Mobile Money, cartes, etc.) — adapté au contexte local ; Stripe présent en code legacy à rationaliser.

### 2.2 Vision produit

Offrir une expérience d’achat en ligne **fluide, mobile-first et locale** : catalogue riche, filtres par catégorie, panier persistant, checkout sécurisé avec compte utilisateur, suivi de commande, et interface admin pour gérer produits, stocks et commandes.

### 2.3 Principes directeurs

| Principe | Description |
|----------|-------------|
| Mobile-first | UI responsive, checkout optimisé téléphone |
| Local-first | CDF, communes, CinetPay, livraison Kinshasa |
| Typage fort | TypeScript + Prisma + Zod partout |
| Séparation des couches | UI → actions/API → services → repositories → DB |
| Sécurité by default | Auth obligatoire au checkout, secrets hors dépôt, RBAC admin |

---

## 3. Objectifs et périmètre

### 3.1 Objectifs principaux (MVP → V1)

| # | Objectif | Priorité |
|---|----------|----------|
| O1 | Catalogue produits navigable avec catégories et fiche détail | P0 |
| O2 | Panier et passage de commande avec compte utilisateur | P0 |
| O3 | Paiement CinetPay avec webhook de confirmation | P0 |
| O4 | Gestion des commandes côté client (historique, statut) | P1 |
| O5 | Back-office admin (produits, commandes, rôles) | P1 |
| O6 | Catalogue et stocks en base PostgreSQL (fin du JSON seul) | P1 |
| O7 | Upload images via Supabase Storage | P1 |
| O8 | Coupons, avis, wishlist synchronisés en BDD | P2 |
| O9 | Analytics admin et notifications email | P2 |
| O10 | SEO, performance (Core Web Vitals), i18n FR/EN | P3 |

### 3.2 Hors périmètre (V1)

- Application mobile native (React Native) — phase ultérieure
- Marketplace multi-vendeurs
- Programme de fidélité avancé
- Intégration ERP externe

### 3.3 Livrables documentaires

| Fichier | Rôle |
|---------|------|
| `read.md` (ce document) | Plan complet et feuille de route |
| `structure.md` | Arborescence cible et responsabilités des dossiers |
| `README.md` | Installation rapide et présentation |
| `docs/AUTH_SETUP.md` | Auth (à mettre à jour vers Better Auth) |

---

## 4. Personas et parcours utilisateurs

### 4.1 Personas

**Client (USER)**  
- Achète des articles mode en ligne depuis Kinshasa ou ailleurs en RDC.  
- Utilise souvent Mobile Money ; préfère voir les prix en CDF ou USD.  
- Peut acheter en invité limité ou avec compte (compte requis au checkout).

**Administrateur (ADMIN)**  
- Gère le catalogue, les prix, les stocks, les commandes et les remboursements.  
- Consulte les tableaux de bord et les journaux d’audit.

**Visiteur (non connecté)**  
- Parcourt le catalogue, ajoute au panier (localStorage), doit se connecter pour payer.

### 4.2 Parcours clés

```
Visiteur → Accueil → Catégorie → Fiche produit → Panier → Connexion → Checkout → CinetPay → Succès → Suivi commande
Admin    → Login → Dashboard → Produits / Commandes / Clients → Mise à jour statuts
```

---

## 5. Stack technique

### 5.1 Frontend & framework

| Technologie | Version (package.json) | Usage |
|-------------|------------------------|--------|
| Next.js | 16.2.6 | App Router, SSR/RSC, API Routes |
| React | 19.0.0 | UI composants |
| TypeScript | ^5 | Typage statique |
| Tailwind CSS | v4.0.0 | Moteur de style haute performance |
| shadcn/ui (Radix) | divers | Composants UI (`components/ui`) |
| Lucide React | ^0.400 | Iconographie |
| Zustand | ^5.0 | Panier, devise, wishlist, UI |
| react-hook-form + Zod | ^7 / ^4 | Formulaires et validation |
| Embla Carousel | ^8.6 | Carrousels hero / produits |
| next-themes | ^0.4 | Mode clair / sombre |

### 5.2 Backend & données

| Technologie | Usage |
|-------------|--------|
| PostgreSQL | Base relationnelle principale |
| Prisma | ORM, migrations, seed |
| Better Auth | Sessions, email/mot de passe, Google, Facebook |
| Supabase | Storage images (`app/api/upload`) |
| Server Actions | Checkout, commandes, admin |

### 5.3 Paiements & services tiers

| Service | Rôle |
|---------|------|
| CinetPay | Paiement principal (cible production) |
| Stripe | Route legacy `app/api/stripe/session` — à retirer ou isoler |
| exchangerate.host | Taux USD → CDF (`lib/constants.ts`) |

---

## 6. Architecture cible

### 6.1 Vue en couches

```mermaid
flowchart TB
  subgraph Client
    Pages[app/* pages RSC]
    Comp[components/*]
    Stores[store/* Zustand]
  end

  subgraph Server
    Actions[app/actions/*]
    API[app/api/*]
    Auth[Better Auth lib/auth.ts]
  end

  subgraph Domain
    Services[lib/services/*]
    Repo[lib/db/repositories/*]
    Valid[lib/validators/*]
    Map[lib/mappers/*]
  end

  subgraph Data
    Prisma[Prisma Client]
    PG[(PostgreSQL)]
    JSON[data/product-data.json]
    SB[(Supabase Storage)]
  end

  Pages --> Comp
  Comp --> Stores
  Pages --> Actions
  Pages --> API
  Actions --> Services
  API --> Services
  Services --> Repo
  Repo --> Prisma
  Prisma --> PG
  Services --> JSON
  API --> SB
  Auth --> Prisma
```

### 6.2 Arborescence cible (résumé)

Voir `structure.md` pour l’arborescence complète. Organisation logique :

| Dossier | Responsabilité |
|---------|----------------|
| `app/(store)/` | Vitrine : accueil, produits, panier, checkout, compte |
| `app/admin/` | Back-office protégé ADMIN |
| `app/api/` | REST : auth, produits, checkout, webhooks, upload, health |
| `components/` | UI réutilisable (layout, produits, auth, admin) |
| `lib/` | Auth, Prisma, services, validators, currency, audit |
| `store/` | État global client (panier, devise, wishlist) |
| `prisma/` | Schéma, migrations, seed |
| `data/` | Catalogue JSON source (transition vers DB) |
| `public/` / Supabase | Médias produits (`/media/`) |

### 6.3 Patterns recommandés

- **Server Components** par défaut ; `"use client"` uniquement pour interactivité.
- **Server Actions** pour mutations (commande, admin) avec revalidation de cache.
- **Repository pattern** pour isoler Prisma (`lib/db/product.repository.ts` existant).
- **Validation Zod** à l’entrée de chaque action/API.
- **RBAC** via `lib/auth/rbac.ts` et `components/auth/role-guard.tsx`.

---

## 7. État actuel du dépôt

### 7.1 Pages et routes implémentées

| Route | Statut | Notes |
|-------|--------|-------|
| `/` | ✅ | Hero, catégories, catalogue récent |
| `/products` | ✅ | Liste produits |
| `/products/[id]` | ✅ | Détail produit |
| `/cart` | ✅ | Panier (Zustand persist) |
| `/checkout` | ⚠️ | Protégé Better Auth ; client checkout partiel |
| `/profile` | ✅ | Profil utilisateur |
| `/dashboard` | ⚠️ | Tableau de bord basique |
| `/auth/sign-in`, sign-up, forgot-password, etc. | ✅ | Flux Better Auth |
| `/buy-product-success` | ✅ | Page succès |
| `/403` | ✅ | Accès refusé |
| `app/(protected)/layout.tsx` | ⚠️ | Redirige vers `/auth/sign-in` (incohérence avec `/auth/sign-in`) |
| Admin (`app/admin/*`) | ❌ | Non créé (cible dans structure.md) |
| `/account/orders` | ❌ | Prévu, non implémenté |

### 7.2 Composants métier

| Zone | Fichiers clés | Statut |
|------|---------------|--------|
| Catégories | `boutique-femme`, `homme`, `enfant`, `sac`, `chaussure`, `accessoire` | ✅ |
| Catalogue | `product-catalog`, `product-card`, `product-list` | ✅ |
| Layout | `navbar/*`, `footer`, `hero`, `carousel` | ✅ |
| Auth | `login-form`, `sign-up-form`, `role-guard`, `user-profile` | ✅ |
| Panier | `store/use-cart.ts` | ✅ local uniquement |
| Devise | `currency-switcher`, `use-currency-store`, cookie `user-currency` | ✅ |

### 7.3 Données produits

- **Source actuelle :** `data/product-data.json` lu par `lib/products.ts` (cache React, conversion USD/CDF, chemins `/media/`).
- **Seed Prisma :** `prisma/seed.ts` — **désaligné** du schéma actuel (champs `price`, `category` vs `basePrice`, `categoryId`, `slug`).
- **API produits :** `app/api/products/route.ts` et `[id]/route.ts` présents.

### 7.4 Authentification

- **Implémentation :** Better Auth (`lib/auth.ts`) + adaptateur Prisma.
- **Providers :** email/mot de passe, Google, Facebook.
- **Rôles :** `USER` / `ADMIN` dans Prisma ; RBAC applicatif dans `lib/auth/rbac.ts`.
- **Doc :** `docs/AUTH_SETUP.md` décrit encore NextAuth — **à mettre à jour**.

### 7.5 Paiement

- **CinetPay :** `checkout-action.tsx`, webhook `app/api/whebhook/cinetpay/route.ts` (typo dossier, logique minimale, statut `PAID` non aligné sur enum Prisma).
- **Stripe :** route encore présente — hors stratégie CinetPay.

---

## 8. Analyse des écarts (cible vs réel)

### 8.1 Structure de fichiers

| Élément cible (`structure.md`) | État réel |
|--------------------------------|-----------|
| Groupe `(store)` avec layouts dédiés | Routes à la racine `app/` sans groupe `(store)` |
| `app/admin/*` complet | Absent |
| `lib/services/*` | Partiel (logique dans actions/composants) |
| `lib/cinetpay/*` module dédié | Logique éparpillée dans checkout-action |
| `middleware.ts` | **Absent** |
| `components/layout/*`, `components/cart/*` | Fichiers à la racine `components/` |
| Modèles Cart, Review, Wishlist Prisma | **Référencés sur User mais non définis** dans `schema.prisma` |

### 8.2 Schéma Prisma vs seed / runtime

| Problème | Impact | Action |
|----------|--------|--------|
| Seed utilise ancien modèle Product | `db:seed` échoue | Réécrire seed (slug, basePrice, Category) |
| Relations Order ↔ Shipment | `Shipment.order` sans champ inverse complet | Compléter schéma |
| Webhook CinetPay | URL, signature, statuts incorrects | Refonte module `lib/cinetpay` |
| Checkout import `better-auth` direct | Incohérent avec `lib/auth` | Unifier instance auth |
| Redirections `/auth/sign-in` | UX cassée | Harmoniser routes + middleware |

### 8.3 Dette technique prioritaire

1. Finaliser `schema.prisma` (Cart, CartItem, Review, Wishlist, Shipment).
2. Migrer catalogue JSON → PostgreSQL avec catégories normalisées.
3. Implémenter middleware de protection (`/checkout`, `/admin`, `/profile`).
4. Corriger webhook CinetPay (chemin, IPN, idempotence).
5. Supprimer ou documenter Stripe comme option secondaire.
6. Aligner documentation AUTH sur Better Auth.

---

## 9. Modèle de données

### 9.1 Domaines

```mermaid
erDiagram
  User ||--o{ Order : places
  User ||--o{ Address : has
  User ||--o{ Session : has
  User ||--o{ Account : oauth
  Category ||--o{ Product : contains
  Product ||--o{ ProductVariant : has
  Product ||--o{ InventoryTransaction : tracks
  Order ||--|{ OrderItem : contains
  Order }o--|| Address : billing
  Order }o--|| Address : shipping
  Order ||--o{ Payment : has
  Order }o--o| Coupon : uses
  Payment ||--o{ Refund : may_have
  ProductVariant ||--o{ OrderItem : sold_as
```

### 9.2 Entités principales (implémentées dans Prisma)

| Modèle | Rôle |
|--------|------|
| `User`, `Session`, `Account`, `VerificationToken` | Auth Better Auth |
| `Category`, `Product`, `ProductVariant` | Catalogue |
| `InventoryTransaction` | Stock par événements (RESTOCK, SALE, RETURN, SHRINKAGE) |
| `Order`, `OrderItem` | Commandes |
| `Address` | Livraison / facturation (commune Kinshasa) |
| `Payment`, `Refund` | Paiements CinetPay |
| `Coupon` | Promotions |
| `ShippingMethod`, `Carrier`, `Shipment` | Logistique |
| `AuditLog` | Traçabilité admin |

### 9.3 Entités à compléter

| Modèle | Champs clés prévus |
|--------|-------------------|
| `Cart` / `CartItem` | Panier serveur lié à `userId` + `variantId` |
| `Wishlist` / `WishlistItem` | Liste de souhaits persistée |
| `Review` | Note + commentaire par produit/utilisateur |

### 9.4 Enums métier

- **OrderStatus :** PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED | CANCELLED | REFUNDED  
- **PaymentStatus :** PENDING → PROCESSING → COMPLETED | FAILED | REFUNDED  
- **Role :** USER, ADMIN  

### 9.5 Règles de stockage des prix

- Toujours stocker les montants en **unité minimale** (centimes USD ou unité CDF entière).
- `OrderItem.unitPrice` et `subtotal` **figés** à la création de commande.
- `Product.basePrice` + `ProductVariant.priceOffset` pour le prix catalogue.

---

## 10. Modules fonctionnels détaillés

### 10.1 Vitrine et catalogue

**Fonctionnalités**

- Page d’accueil : hero, grille catégories, nouveautés.
- Pages catégories : femme, homme, enfant, sac, chaussure, accessoire.
- Liste produits : filtres, tri, recherche (`search-bar`, `sort-filter`, `category-filter`).
- Fiche produit : galerie, tailles/couleurs, prix multi-devise, ajout panier.

**Tâches techniques**

- [ ] Brancher liste/détail sur Prisma au lieu du seul JSON.
- [ ] Générer `slug` SEO par produit et catégorie.
- [ ] Pages `loading.tsx`, `error.tsx`, `not-found.tsx` sur toutes les routes produits.
- [ ] Pagination serveur (`lib/utils/pagination.ts` à créer).

### 10.2 Panier

**Actuel :** Zustand + `localStorage` (`store/use-cart.ts`).

**Cible**

- Panier invité : local jusqu’à connexion.
- À la connexion : fusion panier local → `Cart` en BDD.
- Validation stock avant checkout via `InventoryTransaction`.

**Tâches**

- [ ] Modèles Prisma Cart / CartItem.
- [ ] API `app/api/cart/route.ts` (CRUD).
- [ ] Composants dédiés : `cart-sheet`, `cart-summary`, `add-to-cart-button`.

### 10.3 Checkout et commandes

**Actuel :** Page serveur protégée + `checkout-client.tsx` + `checkout-action.tsx` (CinetPay partiel).

**Cible**

1. Récap panier + adresse livraison (commune, téléphone).
2. Choix devise et mode de livraison (`ShippingMethod`).
3. Création `Order` + `OrderItems` en transaction Prisma.
4. Init paiement CinetPay → redirection.
5. Webhook → mise à jour `Payment` + `Order.status` + décrément stock.
6. Pages `/checkout/success` et `/checkout/cancel`.

**Tâches**

- [ ] Schéma validation `checkout.schema.ts` (Zod).
- [ ] Service `order.service.ts` + transaction inventaire.
- [ ] Numérotation commande `COGI-YYYY-NNNN`.
- [ ] Harmoniser URLs webhook (`/api/webhook/cinetpay`).

### 10.4 Paiement CinetPay

**Flux**

```
Client → create payment (API CinetPay) → redirect payment_url
       → utilisateur paie → IPN webhook → verify signature → update Order
```

**Tâches**

- [ ] Module `lib/cinetpay/` : client, create, verify, types.
- [ ] Vérification signature IPN (doc CinetPay).
- [ ] Idempotence webhook (éviter double traitement).
- [ ] Journalisation `AuditLog` sur chaque changement de statut paiement.
- [ ] Retirer dépendance Stripe ou la feature-flagger.

### 10.5 Authentification et compte

**Fonctionnalités**

- Inscription / connexion email, Google, Facebook.
- Mot de passe oublié, mise à jour mot de passe.
- Profil : nom, email, image.
- Pages protégées via layout `(protected)` + middleware global.

**Tâches**

- [ ] `middleware.ts` : session Better Auth, routes publiques/privées.
- [ ] Unifier redirects (`/auth/sign-in?callbackUrl=...`).
- [ ] Page compte : `/account`, `/account/orders`, `/account/settings`.
- [ ] Script `scripts/set-admin.ts` pour promouvoir un ADMIN.

### 10.6 Administration

**Cible (`app/admin/`)**

| Section | Fonctions |
|---------|-----------|
| Dashboard | CA, commandes du jour, stock bas |
| Produits | CRUD, variants, images Supabase, archivage |
| Commandes | Liste, filtres statut, détail, changement statut |
| Clients | Liste utilisateurs, rôles |
| Analytics | Graphiques ventes (P2) |

**Tâches**

- [ ] Layout admin + `role-guard` ADMIN.
- [ ] `app/actions/admin/order.admin.actions.ts` — compléter.
- [ ] Tables UI : `orders-table`, `products-table`.
- [ ] Intégration `lib/audit.ts` sur actions sensibles.

### 10.7 Médias et assets

- Images catalogue : `public/` et `/media/` (normalisation dans `lib/products.ts`).
- Upload admin : `app/api/upload/route.ts` → Supabase Storage.
- Formats recommandés : WebP, tailles responsive Next/Image.

### 10.8 Devise et tarification

- Cookie `user-currency` (USD | CDF).
- `lib/currency.ts`, `lib/format-currency.ts`, `fetchExchangeRateUSDTo`.
- Taux fixe dev : `2400` CDF/USD dans `lib/products.ts` — remplacer par taux API + cache serveur en prod.

### 10.9 Wishlist et avis (P2)

- Store `store/use-wishlist.ts` existe côté client.
- Persistance BDD après modèles Prisma.
- Modération avis admin.

### 10.10 Notifications (P2)

- Email commande confirmée, expédiée, livrée.
- Provider à choisir : Resend, SendGrid, ou Supabase Edge Functions.

---

## 11. Flux métier principaux

### 11.1 Achat complet (cible)

```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant UI as Next.js UI
  participant A as Server Actions
  participant DB as PostgreSQL
  participant CP as CinetPay

  U->>UI: Ajoute au panier
  U->>UI: Checkout
  UI->>A: Vérifie session
  A->>DB: Crée Order (PENDING)
  A->>CP: Init paiement
  CP-->>U: Page paiement
  CP->>UI: Webhook IPN
  UI->>DB: Order CONFIRMED, Payment COMPLETED
  UI->>DB: InventoryTransaction SALE
  U->>UI: Page succès
```

### 11.2 Gestion stock (ledger)

- Stock disponible = `SUM(quantity)` sur `InventoryTransaction` par produit/variante.
- À la vente : entrée négative `SALE` liée à `orderId`.
- Retour client : `RETURN` positif.

### 11.3 Promotion coupon

1. Saisie code au checkout.
2. Validation : actif, non expiré, `usageCount < usageLimit`, `totalAmount >= minOrderValue`.
3. Application PERCENTAGE ou FIXED_AMOUNT sur `totalAmount`.
4. Incrément `usageCount` après paiement confirmé.

---

## 12. API et intégrations

### 12.1 Routes API existantes

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `/api/auth/[...all]` | * | Better Auth handler |
| `/api/auth/get-session` | GET | Session courante |
| `/api/auth/supabase-token` | * | Token Supabase |
| `/api/products` | GET/POST | Catalogue API |
| `/api/products/[id]` | GET/PATCH/DELETE | Produit unitaire |
| `/api/checkout` | POST | Init checkout |
| `/api/upload` | POST | Upload Supabase |
| `/api/health` | GET | Santé application |
| `/api/whebhook/cinetpay` | POST | Webhook (à corriger) |
| `/api/stripe/session` | POST | Legacy |

### 12.2 Routes API à créer

| Endpoint | Rôle |
|----------|------|
| `/api/cart` | Panier serveur |
| `/api/checkout/create-payment` | Init CinetPay |
| `/api/checkout/verify-payment` | Vérification retour |
| `/api/webhook/cinetpay` | Webhook corrigé (renommer dossier) |

### 12.3 Server Actions

| Fichier | Rôle |
|---------|------|
| `app/actions/order.actions.ts` | CRUD commandes client |
| `app/actions/product.actions.ts` | CRUD produits admin |
| `app/actions/admin/order.admin.actions.ts` | Admin commandes |
| `app/actions/setcurrency.ts` | Cookie devise |
| `app/checkout/checkout-action.ts` | Paiement CinetPay |

---

## 13. Sécurité et conformité

### 13.1 Authentification et autorisation

- Sessions Better Auth (cookies httpOnly via plugin `nextCookies`).
- RBAC : `hasPermission(role, permission)` avant actions admin.
- Checkout et compte : **authentification obligatoire**.
- Page `403` pour accès rôle insuffisant.

### 13.2 Données sensibles

- Ne jamais committer `.env`, `.env.local`.
- Clés CinetPay, Supabase service role, `DATABASE_URL` uniquement serveur.
- Valider et assainir toutes les entrées (Zod).

### 13.3 Paiement

- Vérifier signature des notifications CinetPay.
- Traiter les webhooks de façon **idempotente**.
- Ne jamais faire confiance au seul `return_url` client.

### 13.4 Audit

- Modèle `AuditLog` : `userId`, `action`, `entity`, `entityId`, `metadata`, `ip`.
- Logger : connexions admin, modifications prix, remboursements.

### 13.5 Checklist sécurité avant production

- [ ] HTTPS obligatoire
- [ ] `NEXTAUTH_SECRET` / secret Better Auth fort
- [ ] Rate limiting sur auth et webhooks
- [ ] Headers sécurité (CSP, HSTS) via `next.config.ts`
- [ ] Sauvegardes PostgreSQL automatisées

---

## 14. Configuration et environnement

### 14.1 Prérequis machine

- Node.js ≥ 18
- PostgreSQL (local ou cloud : Supabase, Neon, etc.)
- Compte Supabase (storage)
- Compte CinetPay (sandbox + production)
- Comptes OAuth Google / Facebook (optionnel)

### 14.2 Variables d'environnement

```env
# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development

# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/boutique_cogi

# Better Auth
BETTER_AUTH_SECRET=          # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# CinetPay
CINETPAY_SITE_ID=
CINETPAY_API_KEY=

# Optionnel — Stripe (legacy)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### 14.3 Scripts npm

| Script | Commande | Usage |
|--------|----------|--------|
| Dev | `npm run dev` | Serveur local :3000 |
| Build | `npm run build` | Build production |
| Lint | `npm run lint` | ESLint |
| Prisma generate | `npm run db:generate` | Client Prisma |
| Postinstall | `prisma generate` | Auto après install |

### 14.4 Commandes Prisma recommandées (à documenter dans README)

```bash
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio
```

---

## 15. Feuille de route par phases

### Phase 0 — Stabilisation (1–2 semaines)

**Objectif :** codebase compilable, auth et routes cohérentes.

| ID | Tâche | Priorité |
|----|-------|----------|
| 0.1 | Compléter `schema.prisma` (Cart, Review, Wishlist, fix Shipment) | P0 |
| 0.2 | Réécrire `prisma/seed.ts` aligné sur nouveau schéma | P0 |
| 0.3 | Créer `middleware.ts` (auth + routes protégées) | P0 |
| 0.4 | Harmoniser `/auth/sign-in` et redirects checkout | P0 |
| 0.5 | Mettre à jour `docs/AUTH_SETUP.md` → Better Auth | P1 |
| 0.6 | Corriger typo `whebhook` → `webhook` | P0 |
| 0.7 | Unifier instance auth dans `checkout-action.tsx` | P0 |

**Livrable :** `npm run build` sans erreur, login → checkout sans redirect cassé.

---

### Phase 1 — Catalogue en base (2–3 semaines)

**Objectif :** fin de la dépendance au JSON seul en runtime.

| ID | Tâche | Priorité |
|----|-------|----------|
| 1.1 | Seed catégories (femme, homme, enfant, sac, chaussure, accessoire) | P0 |
| 1.2 | Migrer produits JSON → `Product` + `ProductVariant` | P0 |
| 1.3 | Adapter `lib/products.ts` pour lire Prisma (fallback JSON) | P0 |
| 1.4 | API produits CRUD admin | P1 |
| 1.5 | Upload images Supabase sur création produit | P1 |
| 1.6 | Slugs et métadonnées SEO sur fiches produits | P1 |

**Livrable :** catalogue servi depuis PostgreSQL en production.

---

### Phase 2 — Panier et checkout (2–3 semaines)

**Objectif :** commande bout-en-bout avec CinetPay fiable.

| ID | Tâche | Priorité |
|----|-------|----------|
| 2.1 | Modèles et API panier serveur | P0 |
| 2.2 | Formulaire adresse (commune, téléphone) | P0 |
| 2.3 | Service commande + numéro `COGI-*` | P0 |
| 2.4 | Module `lib/cinetpay` complet | P0 |
| 2.5 | Webhook signé + mise à jour statuts | P0 |
| 2.6 | Pages success / cancel | P0 |
| 2.7 | Décrément stock via `InventoryTransaction` | P0 |
| 2.8 | Page historique commandes client | P1 |

**Livrable :** paiement test sandbox CinetPay validé de bout en bout.

---

### Phase 3 — Administration (2 semaines)

**Objectif :** exploitation autonome par l’équipe COGI.

| ID | Tâche | Priorité |
|----|-------|----------|
| 3.1 | Layout `app/admin` + garde ADMIN | P0 |
| 3.2 | Liste / détail commandes | P0 |
| 3.3 | CRUD produits + variants | P0 |
| 3.4 | Changement statuts commande / expédition | P1 |
| 3.5 | Dashboard métriques simples | P1 |
| 3.6 | Audit log sur actions admin | P1 |

**Livrable :** admin utilisable sans accès base de données.

---

### Phase 4 — Expérience et croissance (3–4 semaines)

| ID | Tâche | Priorité |
|----|-------|----------|
| 4.1 | Wishlist persistée | P2 |
| 4.2 | Avis produits + modération | P2 |
| 4.3 | Coupons au checkout | P2 |
| 4.4 | Notifications email | P2 |
| 4.5 | Optimisation images / Lighthouse | P2 |
| 4.6 | Tests E2E (Playwright) parcours achat | P2 |
| 4.7 | CI/CD (GitHub Actions) + déploiement Vercel | P1 |

---

### Phase 5 — Production et opérations (continu)

| ID | Tâche |
|----|-------|
| 5.1 | Monitoring (Sentry, logs structurés) |
| 5.2 | Sauvegardes et plan de reprise |
| 5.3 | Documentation runbook support client |
| 5.4 | Formation équipe sur admin et CinetPay |
| 5.5 | Passage sandbox → production CinetPay |

---

## 16. Critères de succès et KPIs

### 16.1 Critères MVP (Phase 2 terminée)

- [ ] Un client peut parcourir, ajouter au panier, payer via CinetPay sandbox, et voir sa commande confirmée.
- [ ] Stock décrémenté automatiquement après paiement.
- [ ] Admin peut voir et mettre à jour le statut d’une commande.
- [ ] Aucune clé secrète dans le dépôt Git.
- [ ] Build et lint passent en CI.

### 16.2 KPIs business (post-lancement)

| KPI | Cible indicative |
|-----|------------------|
| Taux de conversion visite → achat | > 1,5 % |
| Taux d’abandon panier | < 70 % |
| Temps moyen checkout | < 3 min |
| Taux échec paiement | < 5 % |
| Temps résolution commande admin | < 24 h |

### 16.3 KPIs techniques

| KPI | Cible |
|-----|-------|
| LCP page accueil | < 2,5 s |
| Disponibilité API | > 99,5 % |
| Temps réponse API produits | < 200 ms p95 |

---

## 17. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Schéma Prisma incomplet bloque migrations | Élevée | Élevé | Phase 0 prioritaire |
| Webhook CinetPay mal configuré | Moyenne | Élevé | Tests sandbox + logs + idempotence |
| Taux CDF instable | Moyenne | Moyen | Cache taux + affichage « indicatif » |
| Double source produits JSON/DB | Élevée | Moyen | Feature flag puis retrait JSON |
| Doc auth obsolète (NextAuth) | Élevée | Faible | Mise à jour docs Phase 0 |
| Routes login incohérentes | Moyenne | Moyen | Middleware centralisé |

---

## 18. Annexes

### 18.1 Catégories métier (catalogue)

| Slug | Libellé | Composant |
|------|---------|-----------|
| `femme` | Femme | `boutique-femme.tsx` |
| `homme` | Homme | `boutique-homme.tsx` |
| `enfant` | Enfant | `boutique-enfant.tsx` |
| `sac` | Sacs | `boutique-sac.tsx` |
| `chaussure` | Chaussures | `boutique-chaussure.tsx` |
| `accessoire` | Accessoires | `boutique-accessoire.tsx` |

### 18.2 Rôles et permissions (RBAC)

| Rôle | Permissions clés |
|------|------------------|
| `user` | profil, panier, checkout, wishlist |
| `admin` | + `admin:dashboard` |
| `super_admin` | toutes permissions |

### 18.3 Références internes

| Chemin | Description |
|--------|-------------|
| `lib/auth.ts` | Configuration Better Auth |
| `lib/products.ts` | Lecture catalogue (JSON) |
| `store/use-cart.ts` | Panier client |
| `prisma/schema.prisma` | Schéma base cible |
| `structure.md` | Arborescence cible |
| `app/checkout/page.tsx` | Checkout protégé |

### 18.4 Références externes

- [Next.js App Router](https://nextjs.org/docs/app)
- [Better Auth](https://www.better-auth.com/docs)
- [Prisma](https://www.prisma.io/docs)
- [CinetPay API](https://docs.cinetpay.com)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

### 18.5 Convention de commits (recommandée)

```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation
refactor: refactor sans changement comportement
chore: maintenance (deps, config)
```

---

## Synthèse pour l'équipe

**Boutique COGI3** dispose d’une **vitrine fonctionnelle** (Next.js, catégories mode, catalogue JSON, panier local, auth Better Auth). La priorité immédiate est la **Phase 0** (schéma Prisma complet, middleware, webhooks CinetPay), suivie de la **migration catalogue en base** et du **checkout paiement fiable**, puis du **back-office admin**.

Ce document doit être mis à jour à chaque fin de phase en cochant les tâches et en ajustant les dates selon la vélocité réelle de l’équipe.

---

*Document généré pour le projet Boutique COGI3 — dépôt GitHub : `EXLS-1/boutiquecogi3`*
