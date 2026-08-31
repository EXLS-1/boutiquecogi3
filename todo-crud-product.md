Terminé. Voici le récapitulatif de l'implémentation du **CRUD Produits** complet et robuste.

## Ce qui a été fait

### 1. `server/actions/product-draft-actions.ts` — réécrit intégralement (le fichier était corrompu, avec des fragments entrelacés qui cassaient le build)
Server actions complètes, type-sûres, consommables depuis les Client Components :

**Produits**
- `createDraftProductAction` — création en transaction avec variants imbriqués, slug/SKU uniques garantis (retries + entropie), entrée dans `statusHistory`
- `listDraftProductsAction` — liste paginée DRAFT/PENDING/SCHEDULED, recherche (nom/SKU/slug), transaction count+fetch
- `getDraftProductAction` — détail complet incluant toutes les variantes
- `updateDraftProductAction` — mise à jour partielle validée (aligne `price` sur `basePrice` si non personnalisé)
- `deleteDraftProductAction` — **suppression douce** (`isdeleted`, `deletedAt`, archivage + historique de statut)
- `duplicateDraftProductAction` — copie complète (images + variants avec SKU régénérés)

**Variants**
- `createVariantAction` — SKU auto ou fourni (unicité vérifiée), limite 50/produit
- `updateVariantAction` — SKU/attributs/priceOffset, détection de collision SKU
- `deleteVariantAction` — **refusée si des commandes y sont rattachées** (intégrité de l'historique), purge des cart items en transaction

**Robustesse transversale** : RBAC (levels 1-3 = global, 4+ = ses propres produits), validation Zod avec `fieldErrors` structurés, codes d'erreur typés (`AUTH_REQUIRED`, `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `INTERNAL_ERROR`), gestion P2002, sérialisation JSON-safe (Decimal/Date), revalidation des paths (`/admin/product/drafts`, `/admin/product`, `/products/[id]`).

### 2. `components/admin/product-crud-manager.tsx` — nouveau composant client
- Formulaire de création avec éditeur de variants multi-lignes (attribut/valeur/SKU/écart de prix)
- Liste des brouillons avec badges statut + compteur de variantes
- Édition inline (SKU et priceOffset par variante, bouton OK si modifié), dialogue d'édition produit
- Duplication, suppression avec confirmation, états de chargement (`useTransition`), messages de succès/erreur

### 3. Intégration
- `app/admin/product/drafts/page.tsx` : le `ProductCrudManager` est monté au-dessus du `DraftManager` (workflow de publication conservé)
- `lib/constants/admin-shortcuts.ts` : la carte est exactement celle demandée — `title: "CRUD Produits"`, `description: "Traitement complet des produits et de leurs variants."`, `href: "/admin/product/drafts"`, `cta: "Voir les brouillons"`, `icon: PackagePlus`, `tone: "text-amber-500"`

### Validation
- `tsc --noEmit` : **aucune erreur dans les fichiers créés/modifiés**. La seule erreur du projet (`TS1005` dans `components/dashboard/product/new-product/dynamic-product-form.tsx:134`) est **pré-existante** et sans rapport (fichier non touché, confirmé via `git status`).

Note : la suppression produit reste douce (soft-delete) conformément au modèle de données (le modèle `ProductVariant` n'a pas de soft-delete, d'où le refus de suppression en cas de commandes rattachées).