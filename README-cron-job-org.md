Intégration cron-job.org — Boutique COGI
Architecture
plain
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  cron-job.org   │────▶│ /api/cron/       │────▶│ BCC Scraper     │
│  (toutes les    │     │ exchange-rate    │     │ (taux USD/CDF)  │
│   heures)       │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Cache Prisma DB  │
                        │ (persistance)    │
                        └──────────────────┘
Variables d'environnement
Ajoutez ces variables dans votre .env :
env
# Token secret pour authentification CRON interne (min 32 caractères)
CRON_SECRET=votre_token_ultra_secret_ici_minimum_32_chars

# Clé API cron-job.org (récupérée sur https://console.cron-job.org/ → Settings)
CRON_JOB_API_KEY=votre_cle_api_cron_job_org

# URL publique de l'application
APP_URL=https://votre-domaine.com
Configuration initiale
1. Créer le job sur cron-job.org
bash
# Fréquence par défaut : toutes les 4 heures
npx tsx scripts/setup-cron-job-org.ts

# Fréquences disponibles :
npx tsx scripts/setup-cron-job-org.ts --frequency=4h       # Toutes les 4 heures (défaut production)
npx tsx scripts/setup-cron-job-org.ts --frequency=hourly   # Toutes les heures
npx tsx scripts/setup-cron-job-org.ts --frequency=daily    # Quotidien à 06:00
npx tsx scripts/setup-cron-job-org.ts --frequency=weekdays  # Lun-Ven à 06:00
npx tsx scripts/setup-cron-job-org.ts --frequency=15min    # Toutes les 15 min (dév/test uniquement)
2. Vérifier le monitoring
bash
# Sans argument → cherche automatiquement le job par titre
npx tsx scripts/monitor-cron-job-org.ts

# Avec un jobId spécifique
npx tsx scripts/monitor-cron-job-org.ts 12345
Sécurité multi-couches
Table
Couche	Mécanisme	Description
1	IP Whitelist	Seules les IPs de cron-job.org sont acceptées
2	Token URL	?token=CRON_SECRET dans l'URL du job
3	Rate Limiting	5 requêtes max par minute par IP
4	RBAC	L1 (SUPER-ADMIN) ou L2 (ADMIN) requis
5	Timeout	30s max d'exécution
6	Timing-safe	Comparaison token en temps constant (anti timing attack)
IPs autorisées de cron-job.org
Les réseaux suivants sont automatiquement whitelistés :
plain
116.203.134.0/24
116.203.135.0/24
23.88.14.0/24
128.140.100.0/24
128.140.101.0/24
159.69.40.0/24
78.46.100.0/24
78.46.101.0/24
⚠️ Ces IPs peuvent changer. Consultez régulièrement la documentation cron-job.org et mettez à jour CRON_JOB_ORG_IPS dans app/api/cron/exchange-rate/route.ts.
Planification
Table
Fréquence	Schedule	Usage
4h	00:00, 04:00, 08:00, 12:00, 16:00, 20:00	Production (défaut)
hourly	Toutes les heures	Forte volatilité
daily	Tous les jours à 06:00	Faible volatilité du taux
weekdays	Lun-Ven à 06:00	Évite les week-ends
15min	Toutes les 15 minutes	Développement / test uniquement
Pourquoi 4 heures ?
BCC met à jour le taux généralement 1-2 fois par jour
6 exécutions/jour = bon équilibre fraîcheur / consommation API
Cache mémoire L1 (1h) + Cache DB L3 = continuité entre les exécutions
Évite le sur-scraping de la BCC (respectueux du serveur)
Réponses API
Table
Status	execution	Description
200	completed	Taux mis à jour avec succès
502	failed_fallback_active	BCC indisponible, fallback actif
403	forbidden	Privilèges insuffisants
429	rate_limited	Trop de requêtes
504	timeout	Délai d'exécution dépassé
500	failed_fallback_active	Erreur interne
Dépannage
"Unauthorized" (401)
Vérifiez que CRON_SECRET est identique côté app et côté cron-job.org
Vérifiez que l'IP de cron-job.org est dans la whitelist
"Forbidden" (403)
Le niveau RBAC de l'appelant est insuffisant (L3-L7)
Utilisez un token CRON_SECRET valide (traité comme L1)
"Rate Limited" (429)
Attendez 60 secondes avant de réessayer
Vérifiez qu'un autre service n'appelle pas la route en boucle
Job non exécuté sur cron-job.org
Vérifiez que le job est enabled dans la console cron-job.org
Consultez l'historique d'exécution via le script monitor
Vérifiez que l'URL est accessible publiquement (pas de firewall)
Vérifiez que saveResponses est activé pour voir les réponses
Erreur "CRON_JOB_API_KEY non configuré"
Ajoutez CRON_JOB_API_KEY dans votre fichier .env
Régénérez la clé sur https://console.cron-job.org/ → Settings
API Service (lib/services/cron-job-org-service.ts)
Fonctions disponibles
TypeScript
// Jobs
listJobs()                    // Liste tous les jobs
getJobDetails(jobId)          // Détails d'un job
createJob(job)                // Crée un job
updateJob(jobId, partial)     // Met à jour un job
deleteJob(jobId)              // Supprime un job

// Historique
getJobHistory(jobId)          // Historique d'exécution
getHistoryItemDetails(jobId, identifier)  // Détails complets

// Dossiers
listFolders()                 // Liste les dossiers
createFolder(title)           // Crée un dossier
updateFolder(id, title)       // Renomme un dossier
deleteFolder(id)              // Supprime un dossier

// Helpers de schedule
hourly()                      // Toutes les heures
dailyAt(hour, minute)         // Quotidien
everyNMinutes(n)              // Toutes les N minutes
everyNHours(n)                // Toutes les N heures
weekdaysAt(hour, minute)      // Jours de semaine
Enums
TypeScript
JobStatus.OK           // 1 — Succès
JobStatus.FAILED_DNS   // 2 — Erreur DNS
JobStatus.FAILED_CONNECT // 3 — Connexion échouée
JobStatus.FAILED_HTTP  // 4 — Erreur HTTP
JobStatus.FAILED_TIMEOUT // 5 — Timeout
// ... etc

RequestMethod.GET     // 0
RequestMethod.POST    // 1
RequestMethod.PUT     // 4
RequestMethod.PATCH   // 8
// ... etc