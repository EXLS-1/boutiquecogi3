# 🤝 Guide de Contribution - Boutique COGI3

Merci de votre intérêt pour contribuer à Boutique COGI3 ! Ce guide vous explique comment contribuer au projet de manière efficace et professionnelle.

---

## 📋 Table des Matières

- [Code de Conduite](#code-de-conduite)
- [Avant de Commencer](#avant-de-commencer)
- [Processus de Contribution](#processus-de-contribution)
- [Normes de Code](#normes-de-code)
- [Tests](#tests)
- [Documentation](#documentation)
- [Messages de Commit](#messages-de-commit)
- [Pull Requests](#pull-requests)

---

## 🤝 Code de Conduite

Nous nous engageons à fournir un environnement accueillant et inclusif. Tous les contributeurs sont tenus de respecter notre [Code de Conduite](CODE_OF_CONDUCT.md).

- **Soyez respectueux** envers tous les contributeurs
- **Évitez le harcèlement** sous toute forme
- **Soyez constructif** dans vos critiques
- **Recherchez le consensus** dans les discussions

---

## ✅ Avant de Commencer

### 1. Configuration Locale

```bash
# Fork le repo sur GitHub
git clone https://github.com/your-username/boutiquecogi3.git
cd boutiquecogi3

# Ajouter l'upstream
git remote add upstream https://github.com/EXLS-1/boutiquecogi3.git

# Installer les dépendances
npm install

# Lancer le projet
npm run dev
```

### 2. Créer une Branche

```bash
# Mettre à jour depuis upstream
git fetch upstream
git checkout main
git merge upstream/main

# Créer une branche feature
git checkout -b feature/my-feature
# Ou pour les bugs
git checkout -b fix/issue-description
```

### 3. Respect des Branches

| Branche     | Usage                |
| ----------- | -------------------- |
| `main`      | Production-ready     |
| `develop`   | Intégration features |
| `feature/*` | Nouvelles features   |
| `fix/*`     | Bug fixes            |
| `docs/*`    | Documentation        |
| `chore/*`   | Dépendances, config  |

---

## 🔄 Processus de Contribution

### Étape 1: Identifier l'Issue

```bash
# Vérifier s'il y a une issue existante
# https://github.com/EXLS-1/boutiquecogi3/issues

# Si non, créer une issue avec le template approprié
# - Feature Request
# - Bug Report
# - Performance Improvement
```

### Étape 2: Discuter l'Approche (pour grandes features)

Commenter sur l'issue pour discuter l'approche avant de commencer à coder.

```
@maintainers Je pense résoudre ce problème par:
1. Créer un nouveau service `x.service.ts`
2. Ajouter des routes API `/api/x`
3. Mettre à jour le composant `X.tsx`

Est-ce l'approche correcte?
```

### Étape 3: Implémenter

Voir [Normes de Code](#normes-de-code) ci-dessous.

### Étape 4: Tester Localement

```bash
# Lancer les tests
npm run test

# Linter le code
npm run lint

# Build pour production
npm run build

# Vérifier les types TypeScript
npx tsc --noEmit
```

### Étape 5: Commit & Push

```bash
# Commit avec message conventionnel (voir Commit Messages)
git add .
git commit -m "feat: add new feature"

# Push vers votre fork
git push origin feature/my-feature
```

### Étape 6: Créer une Pull Request

- Aller sur GitHub
- Cliquer "New Pull Request"
- Compléter le template PR
- Demander review

---

## 📐 Normes de Code

### Style & Formatting

```bash
# Prettier (formatting automatique)
npm run format

# ESLint (linting)
npm run lint:fix
```

### TypeScript Strict

- ✅ Toujours typer les params et retours
- ✅ Utiliser `unknown` plutôt que `any`
- ✅ Utiliser UUID v7 pour tous les nouveaux identifiants

**Exemple Correct:**

```ts
interface UserProps {
  id: string;
  name: string;
  onAction?: (id: string) => Promise<void>;
}

export function User({ id, name, onAction }: UserProps): JSX.Element {
  const handleClick = async () => {
    if (onAction) await onAction(id);
  };
  return <button onClick={handleClick}>{name}</button>;
}
```

### Composants React

```ts
// ✅ Good: Named export, clear props interface
interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <div onClick={() => onSelect(product)}>
      <ShoppingBag size={16} />
      {product.name}
    </div>
  );
}

// ❌ Bad: Anonymous export, any types
export default ({ product, onSelect }: any) => (...)
```

### API Routes

```ts
// ✅ Good: Type-safe, error handling
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const result = await db.create(data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ❌ Bad: No validation, no error handling
export async function POST(req) {
  const data = await req.json();
  const result = await db.create(data);
  return res.json(result);
}
```

### Nommage

```ts
// Components
✅ ProductCard.tsx (PascalCase)
❌ product-card.tsx

// Utils, services, hooks
✅ formatPrice.ts (camelCase)
❌ format-price.ts

// Types
✅ Product, ProductProps (PascalCase)
❌ product, productProps

// Constants
✅ SUPPORTED_CURRENCIES (UPPER_SNAKE_CASE)
❌ supportedCurrencies
```

---

## 🧪 Tests

### Exécuter les Tests

```bash
# Tests unitaires
npm run test

# Tests avec coverage
npm run test:coverage

# E2E tests (si disponibles)
npm run test:e2e
```

### Écrire des Tests

Chaque feature majeure doit avoir des tests:

```ts
// lib/services/__tests__/product.service.test.ts
import { describe, it, expect } from "vitest";
import { getProductById } from "../product.service";

describe("ProductService", () => {
  it("should fetch product by ID", async () => {
    const product = await getProductById("uuid-123");
    expect(product).toBeDefined();
    expect(product.id).toBe("uuid-123");
  });

  it("should return null for non-existent product", async () => {
    const product = await getProductById("invalid-id");
    expect(product).toBeNull();
  });
});
```

---

## 📝 Documentation

### README/Structure

Mettre à jour si vous modifiez:

- Architecture
- Arborescence des fichiers
- Configuration

### Comments Code

Commenter **seulement** la logique métier complexe, pas le code évident:

```ts
// ✅ Good: Explique le pourquoi
// UUID v7 is sortable by timestamp while still being random
const id = generateUUIDv7();

// ❌ Bad: Redondant avec le code
// Create a new UUID
const id = generateUUIDv7();
```

### JSDoc pour Functions Publiques

```ts
/**
 * Convertir un prix USD en devise cible
 * @param amountInCents Montant en cents
 * @param targetCurrency Code devise (ex: 'CDF')
 * @returns Montant converti
 * @throws Error si taux de change indisponible
 */
export async function convertPrice(
  amountInCents: number,
  targetCurrency: string,
): Promise<number> {
  // ...
}
```

---

## 💬 Messages de Commit

Utiliser **Conventional Commits** pour clarté:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types Valides

- `feat:` - Nouvelle feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting, missing semicolons (pas de changement code)
- `refactor:` - Refactoring sans feat/fix
- `perf:` - Performance improvements
- `test:` - Ajout/modification tests
- `chore:` - Build, dépendances, config

### Exemples

```bash
# Feature
git commit -m "feat(products): add product filtering by category"

# Bug fix
git commit -m "fix(cart): fix quantity update not persisting"

# Documentation
git commit -m "docs: update API documentation for checkout endpoint"

# Refactor
git commit -m "refactor(auth): extract RBAC logic to separate module"

# Avec body (pour commits complexes)
git commit -m "feat(payment): integrate CinetPay webhook

- Create webhook endpoint /api/webhook/cinetpay
- Add signature verification
- Update order status on payment confirmation
- Send confirmation email

Fixes #123"
```

---

## 🔀 Pull Requests

### Template PR

```markdown
## 📝 Description

Description brève du changement.

## 🎯 Lié à l'Issue

Fixes #123

## 🔄 Type de Changement

- [ ] Feature nouvelle
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation

## ✅ Checklist

- [ ] Code suivi les normes (ESLint, Prettier)
- [ ] Tests ajoutés/modifiés
- [ ] Documentation mise à jour
- [ ] Pas de warnings TypeScript
- [ ] Testé localement

## 🖼️ Screenshots (si applicable)

Avant/après screenshots.
```

### Règles PR

1. **Une PR = Une Issue** (ou feature cohésive)
2. **Commits atomiques** - Chaque commit doit être logique
3. **Pas de merge directs** - Utiliser Squash & Merge si nécessaire
4. **Répondre aux reviews** - Soit intégrer feedback, soit justifier
5. **Keep it small** - PRs > 400 lignes sont difficiles à reviewer

### Après l'Approval

```bash
# Mettre à jour avec les retours
git add .
git commit -m "chore: address review feedback"
git push origin feature/my-feature

# Une fois mergé, supprimer la branche
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

---

## 🐛 Rapporter un Bug

Utiliser le template [Bug Report](https://github.com/EXLS-1/boutiquecogi3/issues/new?template=bug_report.md):

```markdown
## 🐛 Description du Bug

Description claire et concise.

## 🔄 Étapes pour Reproduire

1. Aller à '...'
2. Cliquer sur '...'
3. Voir l'erreur

## ✅ Comportement Attendu

Description de ce qui devrait se passer.

## ❌ Comportement Actuel

Description de ce qui se passe réellement.

## 📸 Logs/Screenshots

Joindre les logs, screenshots pertinents.

## 🖥️ Environnement

- OS: [e.g. Windows]
- Node: [e.g. 20.0.0]
- npm: [e.g. 10.0.0]
- Branch: [main, develop]
```

---

## 💡 Suggestions de Features

Utiliser [Feature Request](https://github.com/EXLS-1/boutiquecogi3/issues/new?template=feature_request.md):

```markdown
## 🎯 Est-ce lié à un problème?

Décrire le problème utilisateur.

## 💭 Solution Proposée

Décrire comment vous résoudriez le problème.

## 🔄 Alternatives Considérées

Y a-t-il d'autres solutions?

## 📚 Contexte Additionnel

Ressources, exemples, ou références.
```

---

## 📚 Ressources Utiles

- **Architecture**: Voir `structure.md`
- **API**: Voir `API.md`
- **Schéma BD**: `prisma/schema.prisma`
- **Types**: `types/` et `lib/types/`

---

## 🙋 Besoin d'Aide?

- **Issues**: [GitHub Issues](https://github.com/EXLS-1/boutiquecogi3/issues)
- **Discussions**: [GitHub Discussions](https://github.com/EXLS-1/boutiquecogi3/discussions)
- **Email**: contact@boutiquecogi3.com

---

## 🎉 Merci!

Votre contribution aide à rendre Boutique COGI3 meilleure pour tous! 🚀
