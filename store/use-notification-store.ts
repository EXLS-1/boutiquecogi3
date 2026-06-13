// store/use-notification-store.ts
// Gère les messages de feedback utilisateur (succès, erreur, info).
// Implémente une file d'attente avec auto-suppression pour l'atomicité des alertes.

import { create } from "zustand";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; // Durée en ms avant disparition
}

interface NotificationState {
  notifications: Notification[];
  /** Ajoute une notification à la pile avec un ID unique. */
  addNotification: (notification: Omit<Notification, "id">) => void;
  /** Supprime manuellement une notification. */
  removeNotification: (id: string) => void;
  /** Vide toutes les notifications. */
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    // Génération d'un ID unique (UUID v7 compatible ou crypto.randomUUID)
    const id =
      typeof crypto !== "undefined"
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9);
    const duration = notification.duration ?? 5000;

    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));

    // Auto-suppression pour la performance et l'expérience utilisateur
    if (duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}));

/**
 * Note : Ce store peut être consommé par un composant Toast au niveau du layout racine
 * pour afficher les notifications n'importe où dans l'application.
 */
