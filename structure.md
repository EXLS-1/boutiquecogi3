# 📐 Architecture du Projet - Boutique COGI3

## Vue d'ensemble

Boutique COGI3 suit une architecture **en couches (layered architecture)** optimisée pour la scalabilité et la maintenabilité :

```
┌─────────────────────────────────────────────────┐
│           Couche Présentation (UI)              │
│  Components (React) + Pages (Next.js)           │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│       Couche API (Routes Next.js)               │
│  Request validation + Response formatting       │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│    Couche Métier (Services & Repositories)      │
│  Logique applicative, validations métier        │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│    Couche Données (Prisma ORM)                  │
│  Modèles, migrations, transactions              │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│         PostgreSQL Database                     │
└─────────────────────────────────────────────────┘
```

---

## 📂 Arborescence Complète

```
boutiquecogi3/
│
├── 📁 app/                           # Next.js App Router (13+)
│   │
│   ├── 📁 (store)/                   # Routes publiques (sans layout admin)
│   │   ├── layout.tsx                # Layout du store
│   │   ├── page.tsx                  # Accueil
│   │   ├── products/
│   │   │   ├── page.tsx              # Listing produits
│   │   │   └── loading.tsx           # Skeleton loader
│   │   ├── product/[id]/
│   │   │   ├── page.tsx              # Détail produit
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx             # Error boundary
│   │   │   └── not-found.tsx         # 404
│   │   ├── cart/
│   │   │   └── page.tsx              # Page panier
│   │   ├── checkout/
│   │   │   ├── page.tsx              # Processus commande
│   │   │   ├── success/
│   │   │   │   └── page.tsx          # Confirmation paiement
│   │   │   └── cancel/
│   │   │       └── page.tsx          # Annulation paiement
│   │   ├── account/
│   │   │   ├── page.tsx              # Profil utilisateur
│   │   │   ├── orders/
│   │   │   │   └── page.tsx          # Commandes utilisateur
│   │   │   └── settings/
│   │   │       └── page.tsx          # Paramètres compte
│   │   ├── auth/
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx          # Connexion
│   │   │   ├── sign-up/
│   │   │   │   └── page.tsx          # Inscription
│   │   │   └── forgot-password/
│   │   │       └── page.tsx          # Réinitialisé MDP
│   │   ├── buy-product-success/
│   │   │   └── page.tsx              # Succès d'achat
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Tableau de bord utilisateur
│   │   └── (protected)/              # Routes protégées (auth required)
│   │       └── page.tsx
│   │
│   ├── 📁 admin/                     # Panel administrateur
│   │   ├── layout.tsx                # Layout admin avec sidebar
│   │   ├── page.tsx                  # Tableau de bord admin
│   │   ├── products/
│   │   │   ├── page.tsx              # Liste produits
│   │   │   ├── create/
│   │   │   │   └── page.tsx          # Ajouter produit
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Détail produit
│   │   │       └── edit/
│   │   │           └── page.tsx      # Éditer produit
│   │   ├── orders/
│   │   │   └── page.tsx              # Gestion commandes
│   │   ├── customers/
│   │   │   └── page.tsx              # Gestion clients
│   │   ├── analytics/
│   │   │   └── page.tsx              # Statistiques & rapports
│   │   ├── audit/                    # Audit logs
│   │   │   └── page.tsx
│   │   └── settings/                 # Configuration magasin
│   │       └── page.tsx
│   │
│   ├── 📁 api/                       # API Routes (serverless)
│   │   ├── auth/
│   │   │   └── [...all]/
│   │   │       └── route.ts          # Better-Auth catch-all
│   │   ├── products/
│   │   │   ├── route.ts              # GET/POST /api/products
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET/PUT/DELETE /api/products/[id]
│   │   ├── checkout/
│   │   │   ├── route.ts              # GET /api/checkout
│   │   │   └── create-payment/
│   │   │       └── route.ts          # POST /api/checkout/create-payment
│   │   ├── webhook/
│   │   │   └── cinetpay/
│   │   │       └── route.ts          # POST /api/webhook/cinetpay (webhook)
│   │   ├── upload/
│   │   │   └── route.ts              # POST /api/upload (images via Supabase)
│   │   └── health/
│   │       └── route.ts              # GET /api/health (monitoring)
│   │
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Accueil (ou redirect)
│   ├── globals.css                   # Styles globaux
│   ├── error.tsx                     # Error boundary racine
│   ├── not-found.tsx                 # 404 global
│   └── middleware.ts                 # Middleware authentification
│
├── 📁 components/                    # Composants React réutilisables
│   │
│   ├── 📁 ui/                        # Composants primitifs (Radix UI)
│   │   ├── button.tsx                # Bouton
│   │   ├── input.tsx                 # Champ input
│   │   ├── dialog.tsx                # Modal
│   │   ├── dropdown-menu.tsx         # Menu déroulant
│   │   ├── table.tsx                 # Tableau
│   │   ├── badge.tsx                 # Badge/tag
│   │   ├── skeleton.tsx              # Loader
│   │   ├── toast.tsx                 # Notifications
│   │   └── card.tsx                  # Carte
│   │
│   ├── 📁 layout/                    # Composants de mise en page
│   │   ├── navbar/
│   │   │   ├── navbar.tsx            # Navbar principal
│   │   │   ├── navbar-brand.tsx      # Logo
│   │   │   ├── navbar-links.tsx      # Navigation liens
│   │   │   ├── navbar-actions.tsx    # Actions (cart, user)
│   │   │   └── mobile-menu.tsx       # Menu mobile
│   │   ├── footer.tsx                # Pied de page
│   │   ├── container.tsx             # Conteneur max-width
│   │   └── sidebar.tsx               # Sidebar (admin)
│   │
│   ├── 📁 products/                  # Composants produits
│   │   ├── product-card.tsx          # Carte produit
│   │   ├── product-grid.tsx          # Grille produits
│   │   ├── product-list.tsx          # Liste produits
│   │   ├── product-detail.tsx        # Détail produit
│   │   ├── product-gallery.tsx       # Galerie images
│   │   ├── product-form.tsx          # Formulaire ajout/édition
│   │   ├── product-actions.tsx       # Actions (add to cart, wishlist)
│   │   └── product-not-found.tsx     # 404 produit
│   │
│   ├── 📁 cart/                      # Composants panier
│   │   ├── cart-sheet.tsx            # Sidebar panier
│   │   ├── cart-item.tsx             # Ligne panier
│   │   ├── cart-summary.tsx          # Résumé prix
│   │   └── add-to-cart-button.tsx    # Bouton ajouter au panier
│   │
│   ├── 📁 checkout/                  # Composants commande
│   │   ├── checkout-form.tsx         # Formulaire commande
│   │   ├── payment-button.tsx        # Bouton paiement
│   │   ├── payment-status.tsx        # Statut paiement
│   │   └── order-summary.tsx         # Résumé commande
│   │
│   ├── 📁 auth/                      # Composants authentification
│   │   ├── sign-in-form.tsx          # Formulaire connexion
│   │   ├── sign-up-form.tsx          # Formulaire inscription
│   │   ├── auth-provider.tsx         # Context provider
│   │   └── protected-route.tsx       # Wrapper route protégée
│   │
│   ├── 📁 admin/                     # Composants admin
│   │   ├── admin-sidebar.tsx         # Sidebar admin
│   │   ├── dashboard-card.tsx        # Carte dashboard
│   │   ├── orders-table.tsx          # Tableau commandes
│   │   ├── products-table.tsx        # Tableau produits
│   │   └── stats-widget.tsx          # Widget statistiques
│   │
│   └── 📁 providers/                 # Providers Context/Providers
│       ├── auth-provider.tsx         # Provider authentification
│       ├── theme-provider.tsx        # Provider thème (dark/light)
│       ├── query-provider.tsx        # TanStack Query (si utilisé)
│       └── root-providers.tsx        # Combine tous les providers
│
├── 📁 lib/                           # Logique métier & utilitaires
│   │
│   ├── 📁 auth/                      # Authentification & RBAC
│   │   ├── auth.ts                   # Instance Better-Auth
│   │   ├── auth-client.ts            # Client Better-Auth (browser)
│   │   ├── server.ts                 # Helpers serveur (getServerSession, requireAuth)
│   │   ├── client.ts                 # Helpers client
│   │   ├── rbac.ts                   # Rôles & permissions
│   │   ├── schema.ts                 # Schémas Better-Auth
│   │   └── errors.ts                 # Custom auth errors
│   │
│   ├── 📁 db/                        # Base de données
│   │   ├── 📁 repositories/          # Repository pattern
│   │   │   ├── product.repository.ts # Requêtes produits
│   │   │   ├── order.repository.ts   # Requêtes commandes
│   │   │   ├── user.repository.ts    # Requêtes utilisateurs
│   │   │   ├── cart.repository.ts    # Requêtes panier
│   │   │   └── inventory.repository.ts # Requêtes inventaire
│   │   ├── 📁 transactions/          # Transactions métier
│   │   │   ├── order.transaction.ts  # Créer commande (atomic)
│   │   │   └── payment.transaction.ts# Confirmer paiement
│   │   └── prisma.ts                 # Client Prisma singleton
│   │
│   ├── 📁 services/                  # Logique métier (use cases)
│   │   ├── product.service.ts        # Produits
│   │   ├── order.service.ts          # Commandes
│   │   ├── payment.service.ts        # Paiements
│   │   ├── cart.service.ts           # Panier
│   │   ├── inventory.service.ts      # Inventaire
│   │   └── upload.service.ts         # Uploads (Supabase)
│   │
│   ├── 📁 validators/                # Schémas Zod (validation)
│   │   ├── product.schema.ts         # Validation produits
│   │   ├── auth.schema.ts            # Validation auth
│   │   ├── order.schema.ts           # Validation commandes
│   │   ├── cart.schema.ts            # Validation panier
│   │   ├── checkout.schema.ts        # Validation checkout
│   │   └── common.schema.ts          # Schémas communs
│   │
│   ├── 📁 mappers/                   # DTO transformations
│   │   ├── product.mapper.ts         # Product → ProductDTO
│   │   ├── order.mapper.ts           # Order → OrderDTO
│   │   └── user.mapper.ts            # User → UserDTO
│   │
│   ├── 📁 stores/                    # Zustand stores (client state)
│   │   ├── cart.store.ts             # Store panier
│   │   ├── ui.store.ts               # Store UI (drawer, modal state)
│   │   ├── currency.store.ts         # Store devises
│   │   └── auth.store.ts             # Store authentification (client)
│   │
│   ├── 📁 hooks/                     # React Hooks personnalisés
│   │   ├── use-cart.ts               # Hook panier
│   │   ├── use-session.ts            # Hook session
│   │   ├── use-currency.ts           # Hook devises
│   │   ├── use-checkout.ts           # Hook checkout
│   │   └── use-pagination.ts         # Hook pagination
│   │
│   ├── 📁 cinetpay/                  # Intégration CinetPay
│   │   ├── client.ts                 # Client CinetPay API
│   │   ├── create-payment.ts         # Créer paiement
│   │   ├── verify-payment.ts         # Vérifier paiement
│   │   ├── webhook.ts                # Traiter webhook
│   │   └── types.ts                  # Types CinetPay
│   │
│   ├── 📁 supabase/                  # Supabase Storage
│   │   ├── client.ts                 # Client Supabase
│   │   └── upload.ts                 # Helpers upload
│   │
│   ├── 📁 utils/                     # Utilitaires
│   │   ├── currency.ts               # Conversion devises
│   │   ├── price.ts                  # Calcul prix
│   │   ├── slug.ts                   # Génération slugs
│   │   ├── env.ts                    # Validation env vars
│   │   ├── logger.ts                 # Logger
│   │   ├── pagination.ts             # Pagination
│   │   ├── errors.ts                 # Custom errors
│   │   ├── format-currency.ts        # Formatage devises
│   │   ├── uuid.ts                   # UUID v7 helper
│   │   └── audit.ts                  # Audit logging
│   │
│   ├── 📁 constants/                 # Constantes
│   │   ├── routes.ts                 # Routes de l'app
│   │   ├── roles.ts                  # Rôles & permissions
│   │   ├── payment.ts                # Constantes paiement
│   │   └── config.ts                 # Configuration globale
│   │
│   └── 📁 types/                     # Types TypeScript globaux
│       ├── index.ts                  # Exports centralisés
│       └── api.ts                    # Types API réponses
│
├── 📁 types/                         # Types d'application
│   ├── better-auth.d.ts              # Types Better-Auth étendus
│   ├── product.ts                    # Types produits
│   ├── order.ts                      # Types commandes
│   ├── user.ts                       # Types utilisateurs
│   ├── cart.ts                       # Types panier
│   ├── payment.ts                    # Types paiement
│   ├── review.ts                     # Types avis
│   ├── category.ts                   # Types catégories
│   └── address.ts                    # Types adresses
│
├── 📁 styles/                        # Styles CSS
│   ├── globals.css                   # Styles globaux
│   ├── utilities.css                 # Utilitaires (si non-Tailwind)
│   └── animations.css                # Animations custom
│
├── 📁 hooks/                         # Hooks React (app level)
│   ├── use-debounce.ts               # Debounce (optionnel)
│   └── use-media-query.ts            # Media queries responsive
│
├── 📁 store/                         # Zustand stores (app level)
│   └── index.ts                      # Exports stores
│
├── 📁 public/                        # Assets statiques
│   ├── 📁 media/
│   │   └── images/
│   │       ├── products/             # Images produits (seeded)
│   │       ├── banners/              # Bannières
│   │       └── placeholders/         # Placeholders
│   ├── 📁 icons/                     # Icons (SVG)
│   ├── 📁 fonts/                     # Fonts custom
│   ├── logo.svg
│   └── favicon.ico
│
├── 📁 prisma/                        # Prisma ORM
│   ├── schema.prisma                 # Schéma base de données (source of truth)
│   ├── 📁 migrations/                # Historique migrations
│   │   ├── migration_lock.toml
│   │   ├── 20240101000000_init/
│   │   │   └── migration.sql
│   │   └── ...
│   └── seed.ts                       # Seed données (npm run db:seed)
│
├── 📁 scripts/                       # Scripts utilitaires
│   ├── generate-types.ts             # Génération types
│   └── migrate.ts                    # Utilitaires migration
│
├── 🔧 Configuration Files
│   ├── next.config.ts                # Configuration Next.js (images, i18n, etc.)
│   ├── tsconfig.json                 # Configuration TypeScript
│   ├── tailwind.config.js            # Configuration Tailwind CSS
│   ├── postcss.config.js             # Configuration PostCSS
│   ├── eslint.config.mjs             # Configuration ESLint
│   ├── prettier.config.js            # Configuration Prettier
│   ├── .env                          # Variables env (exemple, commité)
│   ├── .env.local                    # Variables env locales (git-ignored)
│   ├── .gitignore                    # Fichiers ignorer
│   └── package.json                  # Dépendances & scripts
│
└── 📄 Documentation
    ├── README.md                     # Guide principal
    ├── structure.md                  # Ce fichier
    ├── CONTRIBUTING.md               # Contribution guide
    └── API.md                        # Documentation API
```

---

## 🔄 Flux de Données

### 1. Authentification

```
User Signup → /auth/sign-up → Sign-up Form
   ↓ (submit) → POST /api/auth/signup → Better-Auth → Prisma (User created)
   ↓ → JWT Token in HTTPOnly Cookie → Redirect /
```

### 2. Navigation Produits

```
GET /products → ProductGrid (SSR)
   ↓ → fetch via Prisma from server → Stream to client
   ↓ → Affiche ProductCard × N
   ↓ → Click on card → /product/[id]
   ↓ → ProductDetail (SSR) → Images, Description, Reviews
   ↓ → Click "Add to Cart" → Zustand cart.store + POST /api/cart
```

### 3. Commande & Paiement

```
Add to Cart → Zustand store + Backend sync
   ↓ → Click Checkout → /checkout
   ↓ → CheckoutForm (validation Zod) → POST /api/checkout/create-payment
   ↓ → CinetPay API → redirect to CinetPay form
   ↓ → User pays → CinetPay webhook → POST /api/webhook/cinetpay
   ↓ → Verify signature → Update Order status in DB
   ↓ → Redirect → /checkout/success
```

### 4. Admin Panel

```
Login as ADMIN role → Middleware check RBAC → /admin
   ↓ → Dashboard (analytics from Prisma) → display KPIs
   ↓ → /admin/products → ProductTable (SSR) → Fetch all products
   ↓ → Edit product → Form → POST /api/products/[id]
   ↓ → Prisma update → Revalidate cache → Redirect /admin/products
```

---

## 🏗️ Patterns & Conventions

### 1. Repository Pattern

```ts
// lib/db/repositories/product.repository.ts
export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { variants: true, images: true },
  });
}

// Usage en service/api
const product = await getProductById(productId);
```

### 2. Service Pattern

```ts
// lib/services/order.service.ts
export async function createOrder(params: CreateOrderParams) {
  // Validation métier
  // Réservation stock
  // Créer commande dans DB
  // Log audit
  return order;
}
```

### 3. Validation avec Zod

```ts
// lib/validators/product.schema.ts
const ProductSchema = z.object({
  name: z.string().min(3).max(255),
  basePrice: z.number().int().positive(),
});

// Dans API route
export async function POST(req: Request) {
  const body = await req.json();
  const data = ProductSchema.parse(body); // throws ZodError si invalide
  // ... process data
}
```

### 4. Error Handling

```ts
// lib/utils/errors.ts
class ValidationError extends Error {
  /* ... */
}
class NotFoundError extends Error {
  /* ... */
}
class ForbiddenError extends Error {
  /* ... */
}

// Dans API routes
try {
  await service.doSomething();
} catch (error) {
  if (error instanceof ValidationError) {
    return json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NotFoundError) {
    return json({ error: error.message }, { status: 404 });
  }
  // ...
}
```

### 5. Zustand Store

```ts
// lib/stores/cart.store.ts
import { create } from "zustand";
export const useCartStore = create((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),
}));

// Dans composant
const { items, addItem } = useCartStore();
```

---

## 🔐 Hiérarchie d'Authentification

```
┌─────────────────────────────────────────┐
│         Middleware                      │
│  Valide JWT token depuis cookies        │
│  Vérifie expiration                     │
└────────────────┬────────────────────────┘
                 ↓
        ┌────────────────┐
        │   Utilisateur? │
        └────┬───────┬───┘
             │       │
        NO   │       │   YES
             ↓       ↓
        ┌─────────────────┐
        │ GUEST/ANONYMOUS │  ← Accès public
        └─────────────────┘
                          ┌──────────────────┐
                          │    User Role?    │
                          └─────────┬────────┘
                                    │
                    ┌───────────────┼──────────────┐
                    ↓               ↓              ↓
              ┌──────────┐    ┌──────────┐   ┌─────────────┐
              │  USER    │    │  ADMIN   │   │ SUPER_ADMIN │
              │ - Store  │    │ - Admin  │   │ - Admin +   │
              │ - Cart   │    │ - Stats  │   │ - Config    │
              │ - Account│    │          │   │ - Audit     │
              └──────────┘    └──────────┘   └─────────────┘
```

---

## 📊 Modèle de Données Simplifié

```
User ──┬──→ Session (JWT)
       ├──→ Account (OAuth - optionnel)
       ├──→ Order ──→ OrderItem ──→ ProductVariant ──→ Product
       ├──→ Cart ──→ CartItem ──→ ProductVariant
       ├──→ Address
       ├──→ Review ──→ Product
       └──→ AuditLog

Product ──┬──→ Category
          ├──→ ProductVariant ──→ InventorySnapshot
          ├──→ ProductImage
          ├──→ ProductTag ──→ Tag
          └──→ Review ← User

Order ────┬──→ Payment ──→ BillingMethod
          ├──→ Shipment ──→ ShippingMethod
          ├──→ OrderStatusHistory
          └──→ OrderAddress

Inventory ──→ InventoryTransaction (log)
            → InventorySnapshot (état)
            → StockReservation (pending orders)
```

---

## ⚡ Performance Optimizations

### Frontend

- ✅ Server Components par défaut (zéro JS hydration)
- ✅ Image optimization avec `next/image`
- ✅ Lazy loading composants avec `dynamic()`
- ✅ Memoization avec `React.memo`, `useMemo`
- ✅ Zustand pour état client léger (< 10KB bundle)

### Backend

- ✅ Database indexes sur clés d'interrogation fréquente
- ✅ Prisma select ciblé (éviter over-fetching)
- ✅ Pagination pour listes longues
- ✅ Caching avec revalidatePath (ISR)
- ✅ Connection pooling PostgreSQL

### Livraison

- ✅ Minification Tailwind (production seulement)
- ✅ Code splitting automatique Next.js
- ✅ CDN Vercel pour assets
- ✅ Compression gzip/brotli

---

## 🧪 Testing Strategy (À implémenter)

```
tests/
├── unit/
│   ├── lib/validators/
│   ├── lib/utils/
│   └── lib/services/
├── integration/
│   ├── api/products.test.ts
│   ├── api/checkout.test.ts
│   └── db/order.service.test.ts
└── e2e/
    ├── checkout.flow.test.ts
    └── admin.dashboard.test.ts
```

---

## 🚀 Deployment Checklist

- [ ] Vérifier `.env.production` correctement configuré
- [ ] Exécuter migrations sur DB production
- [ ] Vérifier variables d'environnement sensibles
- [ ] Activer HTTPS
- [ ] Configurer CORS si API distincte
- [ ] Mettre en place monitoring (Sentry, Datadog)
- [ ] Configurer backups automatiques DB
- [ ] Tester paiement avec CinetPay sandbox→production
- [ ] Vérifier webhooks fonctionnent
- [ ] Load testing avec k6 ou similar

---

## 📚 Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs/
- **Better-Auth**: https://better-auth.com
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zod**: https://zod.dev
- **Zustand**: https://github.com/pmndrs/zustand
