# Codes de statut HTTP

Voici les codes de statut HTTP les plus courants, classés par catégories.

## ⏳ Codes 1xx : Information
* **100 Continue** : Le serveur a reçu les en-têtes de la requête et le client doit continuer à envoyer le corps de la requête.
* **101 Switching Protocols** : Le serveur accepte de changer de protocole (par exemple, passer de HTTP à WebSocket).

## ✅ Codes 2xx : Succès
* **200 OK** : La requête a réussi.
* **201 Created** : La requête a réussi et une nouvelle ressource a été créée (souvent après un formulaire d'inscription ou un upload).
* **204 No Content** : La requête a réussi, mais il n'y a pas de contenu à renvoyer.

## 🔀 Codes 3xx : Redirections
* **301 Moved Permanently** : La ressource a été déplacée définitivement vers une nouvelle URL.
* **302 Found** : La ressource se trouve temporairement ailleurs.
* **304 Not Modified** : Utilisé pour le cache. Indique que la page n'a pas changé depuis la dernière visite, le navigateur peut utiliser sa version en cache.

## 🚨 Codes 4xx : Erreurs Client
* **400 Bad Request** : La requête est mal formée ou invalide (le serveur ne la comprend pas).
* **401 Unauthorized** : Authentification requise. Vous n'êtes pas connecté.
* **403 Forbidden** : Accès interdit. Vous êtes connecté, mais vous n'avez pas les permissions nécessaires.
* **404 Not Found** : La page ou la ressource demandée n'existe pas sur le serveur.
* **405 Method Not Allowed** : La méthode HTTP utilisée (ex: POST) n'est pas supportée pour cette URL.
* **413 Payload Too Large** : Le fichier ou les données envoyées sont trop volumineux.
* **429 Too Many Requests** : Vous avez envoyé trop de requêtes dans un temps donné (rate-limiting).

## 💥 Codes 5xx : Erreurs Serveur
* **500 Internal Server Error** : Erreur générique du serveur. Quelque chose a planté côté serveur.
* **502 Bad Gateway** : Le serveur agissant comme passerelle a reçu une réponse invalide d'un autre serveur en amont.
* **503 Service Unavailable** : Le serveur est temporairement indisponible (souvent dû à une surcharge ou une maintenance).
* **504 Gateway Timeout** : Le serveur passerelle n'a pas reçu de réponse à temps d'un serveur en amont.