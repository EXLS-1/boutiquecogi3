# Configuration NextAuth.js - Boutique COGI

## Variables d'environnement (.env.local)

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000          # URL de votre application
NEXTAUTH_SECRET=your-secret-key-here        # Clé secrète (générez une avec: openssl rand -base64 32)

# Google OAuth (obtenir sur https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/boutique_cogi

# Stripe
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs publiques
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Flux d'authentification

### 1. Configuration du Provider Google OAuth
1. Allez sur https://console.cloud.google.com
2. Créez un projet
3. Activez l'API Google+ pour votre projet
4. Créez des identifiants OAuth 2.0:
   - Type: Application Web
   - URIs autorisés: `http://localhost:3000`
   - URIs de redirection autorisés: `http://localhost:3000/api/auth/callback/google`

### 2. Base de données compatible Auth.js
Le schéma Prisma a été mis à jour avec les modèles Auth.js:
- `User` : Utilisateurs avec OAuth
- `Account` : Comptes OAuth liés
- `Session` : Sessions actives
- `VerificationToken` : Tokens de vérification (pour email/SMS)

### 3. Migration et seed
```bash
# Appliquer les changements de schéma
npm run db:push

# Créer un index sur certains champs
npx prisma db execute --stdin < schema.sql
```

## Flux utilisateur

### Page de Connexion (/login)
- Affiche un bouton "Se connecter avec Google"
- Redirige vers Google OAuth
- Une fois authentifié, crée/met à jour l'utilisateur en BDD
- Redirige vers `/` ou l'URL de callback

### Session utilisateur
- Accessible partout avec `useSession()` (côté client)
- Ou `getServerSession()` (côté serveur)
- Contient: `user.id`, `user.name`, `user.email`, `user.image`

### Pages protégées
Exemple : `/profile` n'est accessible que si l'utilisateur est connecté

```typescript
const session = await getServerSession();
if (!session) {
  redirect("/login?callbackUrl=/profile");
}
```

### Checkout protégé
Le checkout nécessite maintenant une authentification:
1. L'utilisateur clique sur "Passer la commande"
2. Si non connecté → redirige vers `/login?callbackUrl=/checkout`
3. Une fois authentifié → crée la commande avec son ID utilisateur
4. Redirige vers Stripe pour le paiement

## Structure des fichiers créés

```
app/
  ├── api/auth/[...nextauth]/
  │   └── route.ts              # Configuration NextAuth
  ├── login/
  │   └── page.tsx              # Page de connexion
  ├── profile/
  │   └── page.tsx              # Page profil utilisateur (protégée)
  └── checkout/
      └── checkout-action.ts    # Mise à jour pour créer la commande

components/
  ├── auth-button.tsx           # Bouton connexion/menu utilisateur
  ├── auth-provider.tsx         # SessionProvider
  └── root-providers.tsx        # Combine SessionProvider + Toaster
```

## Utilisation dans les composants

### Côté Client
```typescript
"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function MyComponent() {
  const { data: session } = useSession();
  
  if (session) {
    return (
      <div>
        Bienvenue {session.user?.name}!
        <button onClick={() => signOut()}>Logout</button>
      </div>
    );
  }

  return <button onClick={() => signIn("google")}>Sign in</button>;
}
```

### Côté Serveur
```typescript
import { getServerSession } from "next-auth";

export default async function Page() {
  const session = await getServerSession();
  
  if (!session) {
    return <p>Accès refusé</p>;
  }

  return <p>Bienvenue {session.user?.name}</p>;
}
```

## Sécurité

✅ Les mots de passe ne sont jamais stockés (OAuth)
✅ Les tokens sont JWT signés et validés
✅ CSRF protection automatique
✅ Secure cookies (httpOnly, sameSite)
✅ Les commandes sont liées à l'utilisateur authentifié
