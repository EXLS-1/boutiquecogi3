# TODO

## Price & Currency robustesse (DRY)
- [x] Compréhension des store et composants existants
- [x] Création d’un helper partagé: `lib/currency/price-format.ts` (conversion + formatage + gestion rate null)
- [x] Mise à jour de `components/product-price/price.tsx` pour utiliser le helper (suppression logique dupliquée)
- [x] Mise à jour de `components/product-price/currency-selector.tsx` pour supprimer/aligner la logique de formatage dupliquée
- [ ] Lancement d’un build/lint pour valider compilation

