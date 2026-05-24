<h1 align="center">Boutique Cogi3</h1>

## Description du Projet

Boutique Cogi3 est une plateforme e-commerce moderne construite avec les dernières technologies. Elle vise à offrir une expérience d'achat fluide et intuitive pour les utilisateurs, tout en fournissant une gestion robuste pour les administrateurs.

## 🚀 Stack Technique

- **Next.js 16.2.6**: Framework React avec App Router et Server Components.
- **React 19**: Bibliothèque UI avec support des Actions et des Transitions.
- **TypeScript**: Typage statique strict pour une robustesse maximale.
- **Tailwind CSS v4**: Moteur de style ultra-rapide et optimisé.
- **Better-Auth**: Gestion complète des sessions et RBAC (sans Next-Auth).
- **Prisma 7.8.0**: ORM type-safe pour PostgreSQL.
- **Zod**: Bibliothèque de validation de schémas.
- **UUID v7**: Identifiants uniques triables par timestamp pour de meilleures performances d'indexation.
- **PostgreSQL**: Système de gestion de base de données relationnelle open source.
- **Supabase Storage**: Stockage de fichiers et médias (S3 compatible).
- **CinetPay**: Solution de paiement en ligne.
- **Zustand**: Bibliothèque de gestion d'état.

## 🌟 Fonctionnalités Principales

### Pour les Clients

- ✅ **Authentification Sécurisée** - Inscription, connexion, réinitialisation de mot de passe
- ✅ **Catalogue Produits** - Navigation, filtrage avancé, recherche, recommandations
- ✅ **Variantes Produits** - Sélection d'attributs (taille, couleur, etc.)
- ✅ **Panier Persistant** - Synchronisation cross-device via sessions
- ✅ **Processus de Checkout** - Multi-étapes sécurisé avec validation
- ✅ **Paiement CinetPay** - Intégration directe et webhooks validés
- ✅ **Historique Commandes** - Suivi des commandes et détails
- ✅ **Profil Utilisateur** - Gestion d'adresses, préférences
- ✅ **Notifications** - Confirmations de commande, suivi d'expédition
- ✅ **Wishlist** - Sauvegarde de favoris produits
- ✅ **Avis Produits** - Notes et commentaires vérifiés

### Pour les Administrateurs

- ✅ **Dashboard Analytics** - Ventes, revenus, tendances temps réel
- ✅ **Gestion Catalogue** - CRUD produits, variantes, images
- ✅ **Gestion Inventaire** - Stock, réservations, transactions
- ✅ **Gestion Commandes** - Statuts, expéditions, retours
- ✅ **Gestion Clients** - Listes, segmentation, historiques
- ✅ **Gestion Paiements** - Transactions, remboursements, litiges
- ✅ **Audit Logging** - Traçabilité complète des actions
- ✅ **Gestion Coupon** - Création et suivi des promotions
- ✅ **Gestion Taxes** - Configuration par région/pays
- ✅ **Rapports Exportables** - CSV, PDF pour BI

---

## 🔍 Caractéristiques Techniques

### Performance & Scalabilité

- **Server Components** - Rendu côté serveur par défaut pour réduire JS client
- **Image Optimization** - Compression, lazy loading via Next.js Image
- **Edge Caching** - Revalidation intelligente avec revalidatePath()
- **Database Indexing** - Index stratégiques sur clés fréquemment interrogées
- **Connection Pooling** - Prisma avec PgBouncer
- **Zod Parsing** - Validation ultra-rapide côté serveur

### Sécurité

- **HTTPS/TLS** - En production obligatoire
- **CSRF Protection** - Tokens générés par Better-Auth
- **XSS Prevention** - Sanitization React + CSP headers
- **SQL Injection** - Requêtes paramétrées Prisma
- **Rate Limiting** - À implémenter sur routes sensibles
- **Secrets Management** - Variables sécurisées en .env.local
- **Webhook Signature Validation** - CinetPay + timestamp check

### Observabilité

- **Audit Logs** - Toutes actions sensibles tracées
- **Error Boundaries** - Gestion gracieuse des erreurs UI
- **Structured Logging** - Format JSON pour stacktraces
- **Health Check** - Endpoint `/api/health` pour monitoring

---

## 💾 Architecture des Données

### Domaines Métier

1. **Authentication** : User, Session, TwoFactor, VerificationToken
2. **Catalog** : Product, ProductVariant, Category, Review, Tag
3. **Commerce** : Cart, CartItem, Order, OrderItem, Payment
4. **Inventory** : InventorySnapshot, InventoryTransaction, StockReservation
5. **Fulfillment** : Shipment, ShippingMethod, Carrier, Return, Refund
6. **Business** : Coupon, GiftCard, TaxRate, AuditLog

### Stratégies d'Indexing

```prisma
// Clés étrangères (automatique)
@@index([userId, createdAt])

// Requêtes fréquentes
@@index([categoryId, isArchived, basePrice])

// Recherche par slug
@@index([slug])

// Composites pour IN/WHERE complexes
@@index([productId, variantId, createdAt])
```

---

## 🧪 Validation des Données

### Zod Schemas

Tous les inputs (formulaires, API) sont validés avec Zod :

```ts
// lib/validators/product.schema.ts
export const ProductSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().min(10),
  basePrice: z.number().int().positive(),
  categoryId: z.string().uuid().optional(),
});

// Usage: await ProductSchema.parseAsync(req.body)
```

---

## 📝 Contribution

```

```
