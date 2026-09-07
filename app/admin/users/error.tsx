"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="space-y-3 p-6"><h2 className="font-semibold">Impossible de charger les utilisateurs.</h2><button className="underline" onClick={reset}>Réessayer</button></div>;
}
