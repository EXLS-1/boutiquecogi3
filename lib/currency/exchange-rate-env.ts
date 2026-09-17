/** Lit le taux serveur chargé par Next.js ou par le point d'entrée des seeds. */
export function getConfiguredExchangeRate(): number {
  const value = process.env.EXCHANGE_RATE_CDF?.trim();
  const rate = Number(value);

  if (!value || !/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      "EXCHANGE_RATE_CDF doit être un nombre décimal strictement positif dans .env.local, .env ou l'environnement du serveur.",
    );
  }

  return rate;
}
