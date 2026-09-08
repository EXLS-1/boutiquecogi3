# Codes de statut HTTP

Voici la liste complète et structurée des codes de statut HTTP, classés par catégorie. Cette référence est essentielle pour garantir la robustesse, la sécurité et une gestion d'erreur claire dans votre plateforme e-commerce Next.js.

### **1xx : Informations (Réponses provisoires)**
*Le serveur a reçu la requête et continue de la traiter.*
- **`100 Continue`** : Le client peut continuer d'envoyer le corps de sa requête.
- **`101 Switching Protocols`** : Le serveur accepte de changer de protocole (ex: passage à WebSocket).
- **`102 Processing`** : Traitement en cours, utilisé pour éviter les timeouts sur des opérations longues (WebDAV).
- **`103 Early Hints`** : Indications préliminaires permettant au client de précharger des ressources pendant que le serveur prépare la réponse finale.

---

### **2xx : Succès**
*La requête a été correctement reçue, comprise et acceptée.*
- **`200 OK`** : Requêtes traitée avec succès (réponse standard pour `GET`).
- **`201 Created`** : Ressource créée avec succès (réponse standard pour `POST`/`PUT`).
- **`202 Accepted`** : Requête acceptée, mais le traitement est asynchrone ou en arrière-plan.
- **`204 No Content`** : Succès, mais aucun contenu à renvoyer (idéal pour les `DELETE` ou mises à jour partielles).
- **`206 Partial Content`** : Le serveur a traité avec succès une requête de plage partielle (utile pour le streaming ou la reprise de téléchargement).

---

### **3xx : Redirection**
*Des actions supplémentaires sont nécessaires pour terminer la requête.*
- **`301 Moved Permanently`** : La ressource a été déplacée définitivement. **Crucial pour le SEO** (transfert du "link juice").
- **`302 Found`** : La ressource a été déplacée temporairement.
- **`304 Not Modified`** : La ressource n'a pas changé depuis la dernière requête. Le client doit utiliser sa version en cache (**essentiel pour la performance**).
- **`307 Temporary Redirect`** : Redirection temporaire. La méthode HTTP originale (ex: `POST`) **doit** être conservée.
- **`308 Permanent Redirect`** : Redirection permanente. La méthode HTTP originale **doit** être conservée.

---

### **4xx : Erreur Client**
*La requête contient une erreur de syntaxe ou ne peut pas être satisfaite par le client.*
- **`400 Bad Request`** : Requête malformée ou syntaxe invalide.
- **`401 Unauthorized`** : Authentification requise (le client n'est pas identifié).
- **`403 Forbidden`** : Le serveur comprend la requête, mais refuse de l'exécuter (droits insuffisants, même authentifié).
- **`404 Not Found`** : La ressource demandée est introuvable.
- **`405 Method Not Allowed`** : La méthode HTTP utilisée n'est pas supportée pour cette ressource (ex: `DELETE` sur une ressource en lecture seule).
- **`409 Conflict`** : Conflit avec l'état actuel du serveur (ex: tentative de modification simultanée d'une même ressource).
- **`422 Unprocessable Content`** : La requête est bien formée, mais contient des erreurs sémantiques (ex: échec de la validation des données d'un formulaire).
- **`429 Too Many Requests`** : Le client a dépassé la limite de débit (rate limiting). Utile pour la protection anti-fragile de votre API.
- **`451 Unavailable For Legal Reasons`** : La ressource est indisponible pour des raisons légales (censure, droits d'auteur).

---

### **5xx : Erreur Serveur**
*Le serveur a échoué à traiter une requête par ailleurs valide.*
- **`500 Internal Server Error`** : Erreur générique du serveur. Le code a rencontré une situation imprévue (à éviter en production au profit de messages d'erreur plus précis si possible).
- **`501 Not Implemented`** : Le serveur ne supporte pas la fonctionnalité demandée (ex: une méthode HTTP non reconnue).
- **`502 Bad Gateway`** : Le serveur agissant comme passerelle a reçu une réponse invalide d'un serveur en amont.
- **`503 Service Unavailable`** : Service temporairement indisponible (maintenance ou surcharge). Doit idéalement être accompagné d'un en-tête `Retry-After`.
- **`504 Gateway Timeout`** : Le serveur agissant comme passerelle n'a pas reçu de réponse dans les délais impartis du serveur en amont.

---

### 💡 Recommandations pour votre stack (Next.js + Prisma + Better-Auth)
1. **Validation** : Retournez systématiquement `422` pour les erreurs de validation de formulaire (côté client ou serveur via Zod).
2. **Authentification** : Utilisez `401` pour un token expiré/manquant (Better-Auth) et `403` pour un utilisateur connecté mais non autorisé (ex: rôle `ADMIN` requis).
3. **SEO** : Utilisez des `301` (et non des `302`) pour les anciennes URLs de produits renommés ou supprimés, en les redirigeant vers une catégorie pertinente.
4. **Robustesse** : Interceptez les erreurs Prisma (ex: contrainte d'unicité) dans votre couche `lib` pour les traduire proprement en `409` ou `422` plutôt que de laisser remonter un `500`.