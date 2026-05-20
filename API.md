# 📡 Documentation API - Boutique COGI3

## Vue d'ensemble

Tous les endpoints API sont RESTful et retournent du JSON. L'authentification utilise **JWT tokens** stockés en HTTP-only cookies.

### Base URL

```
http://localhost:3000/api
https://boutiquecogi3.vercel.app/api (production)
```

---

## 🔑 Authentification

### Headers Requis (pour routes protégées)

```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Réponse d'Erreur Authentification

```json
{
  "error": "Unauthorized",
  "code": "UNAUTHENTICATED"
}
```

---

## 📦 Endpoints Produits

### GET /api/products

Liste tous les produits actifs avec pagination.

**Query Parameters:**

- `page` (int, default: 1) - Numéro de page
- `limit` (int, default: 12) - Éléments par page
- `categoryId` (uuid) - Filtrer par catégorie
- `search` (string) - Recherche par nom
- `sort` (string: 'newest' | 'price-asc' | 'price-desc' | 'popularity') - Tri

**Request:**

```bash
GET /api/products?page=1&limit=12&categoryId=uuid&sort=newest
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Produit 1",
      "slug": "produit-1",
      "description": "Description...",
      "basePrice": 50000,
      "salePrice": 40000,
      "currency": "USD",
      "isFeatured": true,
      "category": {
        "id": "uuid",
        "name": "Catégorie",
        "slug": "categorie"
      },
      "variants": [
        {
          "id": "uuid",
          "sku": "PROD-001-XL",
          "attributes": { "size": "XL", "color": "Rouge" },
          "priceOffset": 0
        }
      ],
      "productImages": [
        {
          "id": "uuid",
          "url": "https://storage.../image.jpg",
          "alt": "Produit vue avant",
          "position": 0
        }
      ],
      "reviews": [
        {
          "id": "uuid",
          "rating": 5,
          "comment": "Excellent produit!",
          "user": { "name": "Jean" },
          "createdAt": "2024-01-15T10:30:00Z"
        }
      ],
      "rating": 4.5,
      "reviewCount": 12,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 156,
    "pages": 13
  }
}
```

**Error (500):**

```json
{
  "error": "Erreur serveur",
  "code": "INTERNAL_SERVER_ERROR"
}
```

---

### GET /api/products/[id]

Détail d'un produit par ID ou slug.

**Request:**

```bash
GET /api/products/uuid
GET /api/products/produit-1
```

**Response (200):**

```json
{
  "id": "uuid",
  "name": "Produit Premium",
  "slug": "produit-premium",
  "description": "Description complète du produit...",
  "basePrice": 100000,
  "salePrice": 75000,
  "saleStart": "2024-01-01T00:00:00Z",
  "saleEnd": "2024-02-01T00:00:00Z",
  "currency": "USD",
  "category": {
    "id": "uuid",
    "name": "Électronique",
    "slug": "electronique"
  },
  "variants": [
    {
      "id": "uuid",
      "sku": "PROD-UUID-S",
      "attributes": { "size": "S" },
      "priceOffset": 0,
      "inventory": {
        "available": 45,
        "reserved": 2
      }
    }
  ],
  "productImages": [...],
  "reviews": [...],
  "seoTitle": "Produit Premium - Boutique COGI",
  "seoDescription": "Description SEO du produit"
}
```

**Error (404):**

```json
{
  "error": "Produit non trouvé",
  "code": "NOT_FOUND"
}
```

---

### POST /api/products

**[ADMIN ONLY]** Créer un nouveau produit.

**Request:**

```json
{
  "name": "Nouveau Produit",
  "description": "Description détaillée...",
  "basePrice": 50000,
  "categoryId": "uuid",
  "isFeatured": false,
  "seoTitle": "SEO Title",
  "seoDescription": "SEO Description"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "name": "Nouveau Produit",
  "status": "DRAFT"
}
```

**Error (400):**

```json
{
  "error": "Validation failed: basePrice must be positive",
  "code": "VALIDATION_ERROR"
}
```

---

### PUT /api/products/[id]

**[ADMIN ONLY]** Modifier un produit.

**Request:**

```bash
PUT /api/products/uuid
```

```json
{
  "name": "Produit Modifié",
  "description": "Nouvelle description...",
  "basePrice": 60000,
  "salePrice": 45000
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "message": "Produit mis à jour"
}
```

---

### DELETE /api/products/[id]

**[ADMIN ONLY]** Supprimer un produit (soft delete).

**Response (200):**

```json
{
  "message": "Produit supprimé"
}
```

---

## 🛒 Endpoints Panier

### GET /api/cart

Récupérer le panier de l'utilisateur connecté.

**Response (200):**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "items": [
    {
      "id": "uuid",
      "variantId": "uuid",
      "quantity": 2,
      "variant": {
        "id": "uuid",
        "sku": "PROD-001-M",
        "product": {
          "id": "uuid",
          "name": "Produit",
          "slug": "produit"
        }
      },
      "snapshotPriceAtAdd": {
        "basePrice": 50000,
        "salePrice": 40000
      }
    }
  ],
  "subtotal": 160000,
  "itemCount": 2,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### POST /api/cart

Ajouter/mettre à jour un article au panier.

**Request:**

```json
{
  "variantId": "uuid",
  "quantity": 2
}
```

**Response (200):**

```json
{
  "message": "Article ajouté au panier",
  "item": { ... }
}
```

---

### DELETE /api/cart/[itemId]

Supprimer un article du panier.

**Response (200):**

```json
{
  "message": "Article supprimé"
}
```

---

## 🛍️ Endpoints Commandes

### GET /api/checkout

Récupérer les détails du checkout (total, taxes, etc.).

**Response (200):**

```json
{
  "subtotal": 160000,
  "tax": 16000,
  "shipping": 10000,
  "discount": 0,
  "total": 186000,
  "currency": "USD",
  "summary": {
    "itemCount": 2,
    "shippingMethod": "Standard"
  }
}
```

---

### POST /api/checkout/create-payment

Créer une transaction de paiement CinetPay.

**Request:**

```json
{
  "cartItems": [
    {
      "variantId": "uuid",
      "quantity": 2,
      "unitPrice": 40000
    }
  ],
  "billingAddress": {
    "street": "123 Rue de la Paix",
    "commune": "Limete",
    "city": "Kinshasa",
    "country": "RDC",
    "phone": "+243812345678"
  },
  "shippingAddress": {
    "street": "123 Rue de la Paix",
    "commune": "Limete",
    "city": "Kinshasa",
    "country": "RDC",
    "phone": "+243812345678"
  },
  "email": "user@example.com",
  "phone": "+243812345678",
  "currency": "USD"
}
```

**Response (200):**

```json
{
  "cinetpayUrl": "https://checkout.cinetpay.com/...",
  "transactionId": "unique-trans-id",
  "orderId": "uuid",
  "amount": 186000,
  "currency": "USD"
}
```

Redirect user à `cinetpayUrl` pour effectuer le paiement.

---

### POST /api/webhook/cinetpay

**[WEBHOOK]** Reçoit la confirmation de paiement de CinetPay.

**Request (Signature CinetPay):**

```json
{
  "transaction_id": "unique-trans-id",
  "amount": "186000",
  "currency": "USD",
  "status": "completed",
  "description": "Commande COGI-2024-123456",
  "metadata": {
    "orderId": "uuid"
  }
}
```

**Processus:**

1. Valide signature webhook
2. Vérifie montant et devise
3. Update `Order.status` → CONFIRMED
4. Réserve stock
5. Envoie confirmation email

**Response (200):**

```json
{
  "received": true
}
```

---

## 👤 Endpoints Utilisateur

### GET /api/auth/me

Récupérer les infos de l'utilisateur connecté.

**Response (200):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jean Dupont",
  "image": "https://storage.../avatar.jpg",
  "role": "USER",
  "emailVerified": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "addresses": [
    {
      "id": "uuid",
      "label": "Maison",
      "street": "123 Rue",
      "commune": "Limete",
      "city": "Kinshasa",
      "country": "RDC",
      "phone": "+243812345678",
      "isDefault": true
    }
  ]
}
```

**Error (401):**

```json
{
  "error": "Unauthorized",
  "code": "UNAUTHENTICATED"
}
```

---

### PUT /api/auth/me

Mettre à jour le profil utilisateur.

**Request:**

```json
{
  "name": "Jean Marie",
  "image": "https://storage.../new-avatar.jpg"
}
```

**Response (200):**

```json
{
  "message": "Profil mis à jour",
  "user": { ... }
}
```

---

### POST /api/auth/logout

Déconnecter l'utilisateur.

**Response (200):**

```json
{
  "message": "Déconnecté"
}
```

---

## 📤 Endpoints Upload

### POST /api/upload

**[AUTHENTICATED]** Uploader une image vers Supabase Storage.

**Request (FormData):**

```bash
POST /api/upload
Content-Type: multipart/form-data

file=<image.jpg>
folder=products (optionnel: products, banners, avatars)
```

**Response (200):**

```json
{
  "url": "https://storage.../products/image-uuid.jpg",
  "key": "products/image-uuid.jpg",
  "size": 1024000
}
```

**Error (413):**

```json
{
  "error": "Fichier trop volumineux (max 5MB)",
  "code": "FILE_TOO_LARGE"
}
```

---

## 🏥 Endpoints Système

### GET /api/health

Vérifier la santé de l'application.

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "uptime": 3600
}
```

---

## 🔄 Codes d'Erreur Globaux

| Code                    | Status | Description                      |
| ----------------------- | ------ | -------------------------------- |
| `VALIDATION_ERROR`      | 400    | Erreur validation données        |
| `UNAUTHENTICATED`       | 401    | JWT manquant ou expiré           |
| `FORBIDDEN`             | 403    | Permissions insuffisantes        |
| `NOT_FOUND`             | 404    | Ressource non trouvée            |
| `CONFLICT`              | 409    | Conflit (ex: email déjà utilisé) |
| `INTERNAL_SERVER_ERROR` | 500    | Erreur serveur                   |
| `SERVICE_UNAVAILABLE`   | 503    | Service indisponible             |

---

## 🧪 Exemple Flux Complet (cURL)

### 1. Récupérer les produits

```bash
curl -X GET "http://localhost:3000/api/products?limit=5" \
  -H "Content-Type: application/json"
```

### 2. Ajouter au panier

```bash
curl -X POST "http://localhost:3000/api/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "variantId": "uuid",
    "quantity": 2
  }'
```

### 3. Créer paiement

```bash
curl -X POST "http://localhost:3000/api/checkout/create-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "cartItems": [{"variantId": "uuid", "quantity": 2}],
    "billingAddress": {...},
    "email": "user@example.com"
  }'
```

### 4. Redirect CinetPay

Utilisateur complète le paiement sur CinetPay → Webhook reçu → Commande confirmée

---

## 📊 Rate Limiting

Actuellement non implémenté. À ajouter en production :

```
GET /api/products      → 100 req/min par IP
POST /api/cart         → 50 req/min par utilisateur
POST /api/checkout/*   → 10 req/min par utilisateur
POST /api/auth/*       → 5 req/min par email
```

---

## 🔐 CORS Configuration

```ts
// next.config.ts
export default {
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        {
          key: "Access-Control-Allow-Origin",
          value: process.env.CORS_ORIGIN || "*",
        },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET, POST, PUT, DELETE, OPTIONS",
        },
      ],
    },
  ],
};
```

---

## 📝 Changelog

- **v1.0.0** (2024-01-15) - API initiale
- Produits, Panier, Checkout, Paiement CinetPay
- Authentification Better-Auth
