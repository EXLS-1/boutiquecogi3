// components/admin/admin-pin-session.tsx
"use client";

/**
 * Wrapper gérant la session PIN avec timer d'inactivité.
 *
 * - Affiche le contenu si le PIN est validé
 * - Affiche le gate PIN sinon
 * - Détecte l'inactivité (5 min) → invalide la session → réaffiche le gate
 */

import { useState, useCallback } from "react";
import { useInactivityTimer } from "@/hooks/use-inactivity-timer";
import { invalidatePinSessionAction } from "@/lib/pin/admin-pin-actions";
import { AdminPinGate } from "./admin-pin-gate";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const INACTIVITY_DELAY = 5 * 60 * 1000; // 5 minutes

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type AdminPinSessionProps = {
  initiallyVerified: boolean;
  children: React.ReactNode;
};

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

export function AdminPinSession({
  initiallyVerified,
  children,
}: AdminPinSessionProps) {
  const [isVerified, setIsVerified] = useState(initiallyVerified);

  const handleInactivity = useCallback(async () => {
    await invalidatePinSessionAction();
    setIsVerified(false);
  }, []);

  useInactivityTimer(handleInactivity, INACTIVITY_DELAY, isVerified);

  const handlePinVerified = useCallback(() => {
    setIsVerified(true);
  }, []);

  if (!isVerified) {
    return <AdminPinGate onVerified={handlePinVerified} />;
  }

  return <>{children}</>;
}
