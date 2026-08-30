// hooks/use-inactivity-timer.ts
"use client";

/**
 * Hook détectant l'inactivité utilisateur.
 *
 * - Écoute : mousemove, keydown, click, touchstart, scroll
 * - Réinitialise le timer à chaque événement
 * - Appelle le callback après le délai spécifié
 */

import { useEffect, useRef, useCallback } from "react";

const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;

/**
 * @param callback Fonction appelée après inactivité
 * @param delay Délai en millisecondes (défaut : 5 min)
 * @param enabled Active/désactive le timer
 */
export function useInactivityTimer(
  callback: () => void,
  delay: number = 5 * 60 * 1000,
  enabled: boolean = true,
): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        callbackRef.current();
      }, delay);
    }
  }, [delay, enabled]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handleActivity = () => resetTimer();
    EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimer]);
}
