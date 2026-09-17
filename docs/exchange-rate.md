# Taux de change par défaut USD/CDF

Définir `EXCHANGE_RATE_CDF` dans `.env.local`, `.env` ou dans l'environnement du serveur. La valeur représente le nombre de francs CDF pour 1 USD, avec un point comme séparateur décimal.

- Aucun taux numérique de secours n'est conservé dans le code.
- Une variable absente, vide, non numérique ou non positive provoque une erreur explicite.
- Next.js charge les fichiers d'environnement automatiquement. En développement et production, `.env.local` est prioritaire sur `.env` (les fichiers propres à NODE_ENV suivent la priorité standard Next.js).
- Le point d'entrée des seeds charge l'environnement avant ses imports applicatifs : environnement du processus > `.env.local` > `.env`.
- `DEFAULT_USD_TO_CDF_RATE`, `FALLBACK_EXCHANGE_RATE` et `SEED_EXCHANGE_RATE_USD_CDF` utilisent la même valeur. L'ancienne variable `FALLBACK_EXCHANGE_RATE` n'est plus lue.
- Le navigateur récupère le taux via l'API existante ; aucune variable privée n'est exposée via `NEXT_PUBLIC_` ou la configuration Next.js.

Le cache/BCC reste prioritaire dans le service temps réel. Le taux d'environnement remplace uniquement les valeurs par défaut et sert aux conversions synchrones et aux nouvelles données générées par les seeds. Aucune donnée déjà stockée en base n'est modifiée automatiquement.

Après modification de l'environnement, redémarrer le serveur. Les pages pré-calculées ou mises en cache peuvent nécessiter une reconstruction ou une revalidation.

Les fixtures JSON de devises et de configuration système contiennent uniquement des métadonnées statiques. Les taux numériques sont fournis par les modules TypeScript des seeds (`shared/currencies.ts`, `utils/currency.ts` et les seeders bootstrap), car JSON ne peut pas évaluer les variables d'environnement.

Tests ciblés depuis la racine du projet :

```powershell
npx vitest run lib/currency/exchange-rate-env.test.ts prisma/seed/load-env.test.ts
```

Ces tests ne lancent pas les seeds et n'écrivent pas en base.
