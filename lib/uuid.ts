// lib/uuid.ts
import { v7 as uuidv7 } from 'uuid';

/**
 * Génère un UUID v7 (Time-based).
 * Optimisé pour les index de base de données.
 */
export const generateUUIDv7 = () => uuidv7();