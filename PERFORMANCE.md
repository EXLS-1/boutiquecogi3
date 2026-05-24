# ⚡ Guide de Performance & Best Practices - Boutique COGI3

Ce guide documente les optimisations et best practices appliquées au projet Boutique COGI3 pour assurer robustesse, performance et scalabilité.

---

## 📊 Table des Matières

- [Performance Frontend](#performance-frontend)
- [Performance Backend](#performance-backend)
- [Optimisations Base de Données](#optimisations-base-de-données)
- [Sécurité](#sécurité)
- [Observabilité](#observabilité)
- [Scalabilité](#scalabilité)

---

## 🎨 Performance Frontend

### 1. Server Components (Par Défaut)

```tsx
// ✅ Good: Server Component par défaut
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await fetchProducts();
  return <ProductGrid products={products} />;
}

// ❌ Bad: Tout en Client Component
("use client");
export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);
  return <ProductGrid products={products} />;
}
```

**Avantages:**

- ✅ Zéro JavaScript côté client pour le rendu
- ✅ Accès direct à la DB sans API
- ✅ Secrets côté serveur sûrs
- ✅ SEO friendly (isIndexed by default)

### 2. Image Optimization

```tsx
import Image from 'next/image';

// ✅ Good: Image optimisée
<Image
  src="/products/item.jpg"
  alt="Product name"
  width={300}
  height={300}
  priority={false}
  loading="lazy"
  quality={80}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// ❌ Bad: HTML img natif
<img src="/products/item.jpg" alt="Product" />
```

**Optimisations:**

- ✅ Compression automatique (WebP, AVIF)
- ✅ Lazy loading par défaut
- ✅ Responsive images
- ✅ Blur placeholder pendant chargement

### 3. Code Splitting Automatique

```tsx
// ✅ Good: Lazy load modal coûteux
import dynamic from "next/dynamic";

const AdminDashboard = dynamic(() => import("@/components/admin/dashboard"), {
  loading: () => <Skeleton />,
  ssr: false, // Pas de rendu serveur pour heavy component
});

export function ProtectedRoute() {
  return <AdminDashboard />;
}

// ❌ Bad: Importer tout au bundle principal
import AdminDashboard from "@/components/admin/dashboard";
```

### 4. Memoization & Rerender Optimization

```tsx
// ✅ Good: Memoization pour props stables
interface ProductCardProps {
  product: Product;
  onSelect: (id: string) => void;
}

export const ProductCard = React.memo(
  ({ product, onSelect }: ProductCardProps) => {
    return <div onClick={() => onSelect(product.id)}>{product.name}</div>;
  },
  (prev, next) => prev.product.id === next.product.id,
);

// ❌ Bad: Rerender à chaque changement parent
export function ProductCard({ product, onSelect }: ProductCardProps) {
  return <div onClick={() => onSelect(product.id)}>{product.name}</div>;
}
```

### 5. Zustand Store (Lightweight State)

```ts
// ✅ Good: Zustand (1.3KB) vs Redux (50KB)
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useCartStore = create(
  subscribeWithSelector((set) => ({
    items: [],
    addItem: (item) =>
      set((state) => ({ items: [...state.items, item] })),
    // Selector optimal pour rerender seulement sur items change
    selectItemCount: (state) => state.items.length,
  }))
);

// Composant ne rerender que si itemCount change
function CartBadge() {
  const itemCount = useCartStore((state) => state.selectItemCount(state));
  return <span>{itemCount}</span>;
}
```

### 6. Tailwind CSS v4 Optimizations

```css
/* Tailwind v4 utilise un moteur Engine-first ultra rapide */
@import "tailwindcss";
```
**Avantages v4:**
- Build times divisés par 5.
- Zero-config pour la plupart des projets.
- Meilleure gestion des variables CSS natives.

```

```bash
# Production build
npm run build

# Analyze bundle
npm install --save-dev next-bundle-analyzer
# Voir next.config.ts pour config
```

---

## 🔧 Performance Backend

### 1. Prisma Query Optimization

```ts
// ✅ Good: Select spécifique (fetch seulement ce qu'on utilise)
const products = await prisma.product.findMany({
  where: { isArchived: false },
  select: {
    id: true,
    name: true,
    slug: true,
    basePrice: true,
    // Include seulement ce qui est nécessaire
    category: {
      select: { id: true, name: true },
    },
    variants: {
      take: 1,
      select: { sku: true },
    },
  },
  take: 12,
  skip: (page - 1) * 12,
});

// ❌ Bad: Over-fetching tout
const products = await prisma.product.findMany({
  include: {
    category: true,
    variants: true,
    images: true,
    reviews: true,
    tags: true,
    // ... all relations
  },
});
```

**Impact:**

- ✅ Réduit la payload de 70-90%
- ✅ Diminue la charge DB
- ✅ Plus rapide transfer réseau

### 2. Pagination

```ts
// ✅ Good: Pagination pour éviter over-loading
export async function getProducts(page: number = 1, limit: number = 12) {
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { isArchived: false },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where: { isArchived: false } }),
  ]);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

// ❌ Bad: Fetch tous les produits
const allProducts = await prisma.product.findMany();
```

### 3. Batch Operations

```ts
// ✅ Good: Batch update au lieu de requêtes individuelles
await prisma.product.updateMany({
  where: { id: { in: productIds } },
  data: { status: "ARCHIVED" },
});

// ❌ Bad: Boucle de mises à jour individuelles
for (const id of productIds) {
  await prisma.product.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
}
```

### 4. Transaction Management

```ts
// ✅ Good: Atomic transaction pour order creation
export async function createOrderFromCart(params: CreateOrderParams) {
  return await prisma.$transaction(async (tx) => {
    // 1. Créer la commande
    const order = await tx.order.create({
      data: {
        userId: params.userId,
        status: "PENDING",
        totalAmount: params.total,
      },
    });

    // 2. Créer les ligne articles
    await tx.orderItem.createMany({
      data: params.items.map((item) => ({
        orderId: order.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    });

    // 3. Réserver stock
    await tx.stockReservation.createMany({
      data: params.items.map((item) => ({
        orderId: order.id,
        variantId: item.variantId,
        quantity: item.quantity,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      })),
    });

    return order;
  });
}
```

**Garantie:** Soit tout réussit, soit tout échoue. Pas de state inconsistent.

### 5. API Response Caching

```ts
// ✅ Good: Cache ISR avec revalidation
export const revalidate = 3600; // 1 hour

export async function GET(req: NextRequest) {
  const products = await getProducts();
  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

// Revalidate manuellement après mutation
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const newProduct = await createProduct(await req.json());

  revalidatePath("/products");
  revalidateTag("products-list");

  return NextResponse.json(newProduct, { status: 201 });
}
```

---

## 🗄️ Optimisations Base de Données

### 1. Strategic Indexing

```prisma
// ✅ Good: Index sur requêtes fréquentes
model Product {
  id   String   @id @db.Uuid
  name String
  slug String   @unique
  categoryId String? @db.Uuid

  createdAt DateTime @default(now())

  // Index simple sur recherche par slug
  @@index([slug])

  // Index composite pour filtrage courant
  @@index([categoryId, createdAt(sort: Desc)])
}

model Order {
  id        String   @id @db.Uuid
  userId    String   @db.Uuid
  status    OrderStatus
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  // Index pour requête fréquente: orders par user avec date
  @@index([userId, createdAt(sort: Desc)])

  // Index pour analytics: commandes par statut
  @@index([status, createdAt(sort: Desc)])
}

// ❌ Bad: Pas assez d'index
model Product {
  id   String @id
  name String
  slug String
  // ... aucun index supplémentaire
}
```

### 2. Connection Pooling

```env
# .env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&pgbouncer=true"

# Ou utiliser pgBouncer:
# postgresql://pgbouncer:5432/db (pgBouncer acts as proxy)
```

### 3. Query Analysis

```bash
# Vérifier les slow queries avec pg_stat_statements
psql -U postgres -d boutiquecogi3 -c "
  SELECT query, calls, mean_time
  FROM pg_stat_statements
  WHERE mean_time > 100
  ORDER BY mean_time DESC LIMIT 10;
"

# Explain plan
EXPLAIN ANALYZE SELECT * FROM product WHERE categoryId = 'uuid' ORDER BY createdAt DESC LIMIT 10;
```

### 4. Soft Deletes

```prisma
// ✅ Good: Soft delete pour données sensibles
model User {
  id   String   @id @db.Uuid
  email String @unique
  deletedAt DateTime?

  @@index([deletedAt]) // Accès rapide aux actifs: WHERE deletedAt IS NULL
}

// Requête: Utilisateurs actifs seulement
const activeUsers = await prisma.user.findMany({
  where: { deletedAt: null }
});
```

---

## 🔐 Sécurité

### 1. Input Validation (Zod)

```ts
// ✅ Good: Validation stricte côté serveur
const ProductSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Min 3 caractères" })
    .max(255, { message: "Max 255 caractères" })
    .trim(),
  basePrice: z.number().int().positive({ message: "Prix doit être positif" }),
  categoryId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ProductSchema.parse(body);

    // data is now fully typed and validated
    const product = await createProduct(data);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    // ...
  }
}
```

### 2. Authentication & RBAC

```ts
// ✅ Good: Enforcer role-based permissions
import { requirePermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/rbac";

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  // Will throw if user lacks permission
  const user = await requirePermission(PERMISSIONS.ADMIN_DASHBOARD);

  const product = await prisma.product.delete({
    where: { id: params.id },
  });

  return NextResponse.json(product);
}
```

### 3. Webhook Verification

```ts
// ✅ Good: Verify CinetPay webhook signature
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-cinetpay-signature");

  const computedSig = crypto
    .createHmac("sha256", process.env.CINETPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  if (signature !== computedSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  // Process webhook
  return NextResponse.json({ received: true });
}
```

### 4. Rate Limiting (À Implémenter)

```ts
// ✅ Recommandé: Ajouter rate limiting
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 req/min
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // Process request
}
```

### 5. Sensitive Data Protection

```ts
// ✅ Good: Masquer données sensibles en réponse API
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  // Ne pas exposer le hash du mot de passe
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    // password: undefined (jamais exposer)
  });
}

// ✅ Never expose secrets côté client
// .env.local - Disponible côté server et client
NEXT_PUBLIC_SUPABASE_URL=...

// .env - Côté serveur seulement
CINETPAY_API_KEY=... (NOT exposed to client)
DATABASE_URL=...
```

---

## 📊 Observabilité

### 1. Structured Logging

```ts
// ✅ Good: JSON logging pour parsing machine
import { logger } from "@/lib/utils/logger";

export async function createOrder(params: CreateOrderParams) {
  try {
    logger.info("Creating order", {
      userId: params.userId,
      itemCount: params.items.length,
      total: params.total,
    });

    const order = await createOrderInDB(params);

    logger.info("Order created", {
      orderId: order.id,
      duration: Date.now() - startTime,
    });

    return order;
  } catch (error) {
    logger.error("Order creation failed", {
      userId: params.userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
```

### 2. Error Tracking (Sentry)

```bash
# Installer Sentry
npm install @sentry/nextjs

# Init dans next.config.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 3. Performance Monitoring

```ts
// ✅ Good: Track slow queries
export async function getProducts() {
  const start = Date.now();

  try {
    const products = await prisma.product.findMany({
      take: 12,
    });

    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn("Slow query detected", {
        duration,
        query: "getProducts",
      });
    }

    return products;
  } catch (error) {
    logger.error("Query failed", { error });
    throw error;
  }
}
```

---

## 📈 Scalabilité

### 1. Horizontal Scaling

```ts
// ✅ Good: Stateless API routes pour scale horizontally
export async function POST(req: NextRequest) {
  // Ne pas stocker d'état local
  // Toute session vient de JWT + DB

  const session = await getServerSession();
  const order = await createOrder(session.user.id);

  return NextResponse.json(order);
}
```

### 2. Queue Management

```ts
// ✅ Recommandé: Async jobs via queue
import Bull from "bull";

const emailQueue = new Bull("send-email", process.env.REDIS_URL);

// Enqueue job
await emailQueue.add(
  {
    to: user.email,
    subject: "Order Confirmation",
    template: "order-confirmation",
  },
  { attempts: 3, backoff: "exponential" },
);

// Worker
emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

### 3. Database Replication

```env
# Read replica for analytics queries
# main: postgresql://host1:5432/db (writes)
# replica: postgresql://host2:5432/db (reads)
READ_DATABASE_URL="postgresql://host2:5432/db"
```

```ts
// ✅ Route analytics reads to replica
const analytics = await prismaReadReplica.order.groupBy({
  by: ["status"],
  _count: true,
});
```

---

## 🎯 Checklist Pré-Production

- [ ] Minification CSS/JS activée
- [ ] Images optimisées (WebP, compression)
- [ ] Database indexes vérifiés
- [ ] Slow queries identifiées et optimisées
- [ ] Cache headers configurés
- [ ] Rate limiting implémenté
- [ ] Error tracking (Sentry) activé
- [ ] Logging structuré en place
- [ ] HTTPS/TLS obligatoire
- [ ] Secrets management sécurisé
- [ ] Backups DB automatiques
- [ ] Monitoring & alertes configurés
- [ ] Load testing complété (k6, Artillery)
- [ ] Tests E2E passant
- [ ] Documentation mise à jour

---

## 📚 Ressources

- [Next.js Performance](https://nextjs.org/learn-nextjs/performance)
- [Prisma Performance](https://www.prisma.io/docs/concepts/overview/prisma-in-your-stack/is-prisma-for-me)
- [Web Vitals](https://web.dev/vitals/)
- [OWASP Security](https://owasp.org/www-project-top-ten/)
