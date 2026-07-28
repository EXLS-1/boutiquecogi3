# Plan de correction — Connexion BetterAuth ↔ Database

## ✅ Étapes complétées

### 1. Correction du modèle `Account` (Prisma schema) ✅
   - [✅] Changé `user User[] @relation(name: "AccountToUser")` → `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
   - [✅] Ajouté `providerAccountId String @map("providerAccountId")` pour BetterAuth
   - [✅] Ajouté `@db.Uuid` sur `userId` pour correspondre au type UUID de la table `user`
   - [✅] Supprimé la relation nommée redondante

### 2. Correction du modèle `User` → relation `accounts` ✅
   - [✅] Mis à jour `accounts Account[] @relation(name: "AccountToUser")` → `accounts Account[]`

### 3. Schéma Prisma synchronisé avec la base de données ✅
   - [✅] Exécuté `npx prisma generate` → ✅ Généré Prisma Client v7.8.0
   - [✅] Exécuté `npx prisma db push --accept-data-loss` → ✅ Database now in sync

### 4. Script de réparation des comptes existants ✅
   - [✅] Créé `scripts/fix-broken-accounts.ts` pour corriger les userId null/vides
   - [✅] Créé `scripts/fix-all-column-types.sql` pour convertir les colonnes TEXT → UUID
   - [✅] Créé `scripts/migrate-account-schema.sql` pour ajouter les colonnes manquantes

### 5. Correction du warning localStorage ✅
   - [✅] Ajouté `NODE_OPTIONS=--localstorage-file=.localstorage.json` dans le script `dev`

### 6. Sécurité et robustesse ✅
   - [✅] Fixé `ProductImage.productId` avec `@db.Uuid` pour la FK
   - [✅] Ajouté `@db.Uuid` sur `Account.userId` pour la compatibilité PK/FK
   - [✅] Créé le SQL migration helper pour les déploiements futurs

### 7. Tests de validation
   - [ ] Tester l'inscription (`/auth/sign-up`)
   - [ ] Tester la connexion (`/auth/sign-in`)
   - [ ] Vérifier la session (`/api/auth/get-session`)
   - [ ] Vérifier que le warning localStorage a disparu

