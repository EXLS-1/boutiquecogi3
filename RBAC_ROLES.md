# Documentation RBAC — Rôles, Permissions et Restrictions

> **Projet :** application e-commerce (Next.js / API JWT)
> 

## Hiérarchie des rôles

```
Super-Admin  >  Admin  >  Manager  >  Editor  >  Supervisor  >  User  >  Guest
```

Principe : **héritage descendant** — chaque rôle possède ses propres permissions **plus** celles de tous les rôles situés en dessous de lui. Un `Admin` peut donc tout faire qu'un `Manager` peut faire, et ainsi de suite.

---

## 1. Super-Admin

**Rôle :** propriétaire de la plateforme. Un seul compte (ou très peu).

### Permissions
- Tout ce qu'un Admin peut faire.
- Gestion des comptes Admin (création, promotion, révocation).
- Accès aux paramètres système et configuration globale (secrets, variables d'environnement applicatives, intégrations : Stripe, etc.).
- Gestion des rôles et de la matrice de permissions elle-même.
- Accès aux journaux d'audit et à la surveillance d'infrastructure.
- Actions irréversibles : purge de données, réinitialisation complète d'un environnement.

### Restrictions
- Aucune restriction fonctionnelle.
- **Recommandation :** exiger une authentification à deux facteurs (2FA) obligatoire et journaliser chaque action dans un log d'audit immuable.

---

## 2. Admin

**Rôle :** administrateur fonctionnel de l'application.

### Permissions
- Tout ce qu'un Manager peut faire.
- Création, modification et désactivation des comptes utilisateurs (sauf les comptes Super-Admin).
- Attribution des rôles jusqu'à `Manager` inclus.
- Configuration de l'application : paramètres du catalogue, taxes, frais de livraison, pages de contenu.
- Consultation des statistiques globales (ventes, chiffre d'affaires, inscriptions).
- Gestion des promotions et codes de réduction.

### Restrictions
- ❌ Ne peut ni créer, ni modifier, ni supprimer un compte **Super-Admin**.
- ❌ Pas d'accès aux paramètres système (secrets, configuration serveur, infrastructure).
- ❌ Ne peut pas modifier la matrice de permissions elle-même.

---

## 3. Manager

**Rôle :** responsable opérationnel (catalogue, commandes, équipe éditoriale).

### Permissions
- Tout ce qu'un Supervisor peut faire.
- Création, modification et suppression de **produits** (hors publication finale si workflow de validation actif).
- Gestion des **commandes** : consultation, changement de statut, remboursements, annulations.
- Gestion des **stocks** : niveaux d'inventaire, alertes de réapprovisionnement.
- Gestion des **catégories** et des collections.
- Supervision des contenus : peut soumettre des contenus Editor à validation.

### Restrictions
- ❌ Pas de gestion des comptes utilisateurs ni attribution de rôles.
- ❌ Pas d'accès à la configuration globale de l'application (taxes, frais, paramètres système).
- ❌ Ne peut pas supprimer un produit déjà commandé (traçabilité fiscale) — demande Admin requise.

---

## 4. Editor

**Rôle :** contributeur de contenu.

### Permissions
- Tout ce qu'un User peut faire.
- Création et modification de **contenus en brouillon** : fiches produits (hors prix et stock), articles, pages, visuels.
- Modification de son propre contenu tant qu'il n'est pas publié.
- Consultation du catalogue en back-office.

### Restrictions
- ❌ **Aucune publication directe** — les contenus passent par validation d'un Supervisor ou plus.
- ❌ Ne peut pas modifier les prix, les stocks, ni les statuts de commande.
- ❌ Ne peut voir que ses propres brouillons (pas ceux des autres Editors).
- ❌ Pas d'accès aux statistiques globales ni aux données clients.

---

## 5. Supervisor

**Rôle :** superviseur de flux (validation, modération, qualité).

### Permissions
- Tout ce qu'un Editor peut faire.
- **Validation** des contenus soumis par les Editors (approbation / rejet avant publication).
- **Modération** : avis clients, commentaires, signalements, contenus utilisateurs.
- Consultation des commandes en lecture seule (suivi et support client de niveau 2).
- Mise en pause temporaire d'un produit ou d'un contenu signalé.

### Restrictions
- ❌ Ne peut pas créer ou supprimer de produits directement (soumettre à un Manager/Admin).
- ❌ Pas de gestion des stocks ni des remboursements.
- ❌ Aucune modification des comptes ou des paramètres.

---

## 6. User

**Rôle :** client authentifié standard (rôle par défaut à l'inscription).

### Permissions
- Consulter le catalogue et les produits publiés.
- Gérer son **profil** : nom, adresse, préférences.
- Passer des **commandes**, consulter son historique, suivre ses livraisons.
- Laisser des **avis** sur ses achats.
- Gérer son panier et ses listes de favoris.

### Restrictions
- ❌ Aucun accès au back-office.
- ❌ Ne peut voir que ses propres données (pas celles des autres utilisateurs).
- ❌ Ne peut pas modifier les prix, produits, commandes d'autrui ou contenus du site.

---

## 7. Guest

**Rôle :** visiteur non authentifié (aucun compte, aucun JWT valide).

### Permissions
- Consulter le catalogue et les pages publiques.
- Naviguer, rechercher, ajouter au panier (session anonyme).
- Consulter les avis publiés.

### Restrictions
- ❌ Ne peut **pas commander** (authentification requise au checkout).
- ❌ Ne peut **pas laisser d'avis** (achat vérifié requis).
- ❌ Aucun accès à un espace personnel, aucune donnée persistante liée à un compte.
- ❌ Soumis au **rate limiting** général de l'API (`100 requêtes/minute/IP+route`, cf. `lib/api/security/core.ts:19-20`) et à la protection CSRF sur les routes sensibles.

---

## Matrice récapitulative

| Action | Super-Admin | Admin | Manager | Supervisor | Editor | User | Guest |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Config système / secrets | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gérer les rôles & permissions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gérer les comptes utilisateurs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Config app (taxes, livraison, promos) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CRUD produits | ✅ | ✅ | ✅ | ❌¹ | 📝² | ❌ | ❌ |
| Gestion stocks | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestion commandes & remboursements | ✅ | ✅ | ✅ | 👁️ | ❌ | 👁️³ | ❌ |
| Valider / modérer les contenus | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer du contenu (brouillon) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Publier du contenu | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Consulter le catalogue | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Commander / laisser un avis | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Gérer son profil | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

¹ Peut soumettre une demande, pas créer directement. ² Brouillon uniquement, soumis à validation. ³ Ses propres commandes uniquement.

---

## Implantation technique (recommandée)

### 3. Contrôles complémentaires à prévoir

- **Accès aux ressources propres** : un `User` ne doit accéder qu'à *ses* commandes — vérifier `order.userId === user.userId` en plus du rôle.
- **Anti-élévation de privilèges** : un `Admin` ne doit jamais pouvoir modifier le champ `role` d'un `Super-Admin` (contrôle côté serveur, pas seulement côté UI).
- **Logs d'audit** : journaliser les actions sensibles (changement de rôle, remboursement, suppression de produit) avec l'identifiant de l'acteur.
- **Migration des rôles existants** : `admin` → `admin`, `moderator` → `supervisor` (le plus proche fonctionnellement).

---
