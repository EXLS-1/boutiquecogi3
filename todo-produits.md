Completed

Les deux fichiers ont été créés avec succès. Voici le résumé final de la livraison :

✅ Fichiers créés et livrés
1. 📝 Composant formulaire — components/dashboard/product/new-product/dynamic-product-form.tsx
Formulaire Dialog complet avec :

Champs de base : nom, description, catégorie, prix de base (obligatoires : nom + prix)
Section attributs dynamiques (clé/valeur ajoutées/supprimées à la volée)
Onglet Simple : SKU auto-généré, une seule variante implicite
Onglet Variantes : ajout/suppression de variantes, chacune avec SKU, offset prix, stock, et attributs spécifiques (couleur, taille, matière, poids, dimension)
Intégration hook useCreateProduct() avec gestion isPending, error, data
Reset du formulaire après création réussie
2. ⏰ Cron de libération — app/api/cron/release-abandoned-carts/route.ts
Endpoint GET protégé par CRON_SECRET qui :

Détecte les paniers expirés (expiresAt < now() et non déjà traités dans AbandonedCart)
Pour chaque panier, libère le stock réservé via StockService.release() (le variantId est résolu en productId via la relation ProductVariant)
Trace l'abandon dans la table AbandonedCart
Gère les erreurs par panier (un échec ne bloque pas les autres)
🧪 Pour intégrer le formulaire
Importez <DynamicProductForm /> dans n'importe quelle page admin (ex: app/dashboard/products/page.tsx) :


import { DynamicProductForm } from "@/components/dashboard/product/new-product/dynamic-product-form";

// Dans le JSX :
<DynamicProductForm />
⚙️ Configuration du cron (Vercel)
Ajoutez dans vercel.json :


{
  "crons": [
    {
      "path": "/api/cron/release-abandoned-carts",
      "schedule": "*/10 * * * *"
    }
  ]
}
Et définissez la variable d'environnement CRON_SECRET dans votre dashboard Vercel.

📊 Flux complet du cycle de vie du stock
Étape	Action	Service
Ajout au panier	reserved += qty	StockService.reserve()
Paiement validé	quantity -= qty, reserved -= qty	StockService.adjust("OUT")
Annulation commande	reserved -= qty	StockService.release()
Panier expiré (cron)	reserved -= qty + trace AbandonedCart	Cron → StockService.release()
L'architecture est anti-overselling (row-level locking via updateMany avec quantity >= X), atomique (transactions Prisma), et zéro produit statique (≥ 1 variante + ≥ 1 stock obligatoire via normalizeVariants() côté serveur).