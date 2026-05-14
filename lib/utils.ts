// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ReadonlyURLSearchParams } from "next/navigation"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const hasEnvVars = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Génère une URL complète avec des paramètres de recherche synchronisés.
 * @param pathname Le chemin actuel (ex: /shop)
 * @param params L'instance actuelle de URLSearchParams
 */
export const createUrl = (pathname: string, params: URLSearchParams | ReadonlyURLSearchParams) => {
  const paramsString = params.toString();
  const queryString = `${paramsString.length ? '?' : ''}${paramsString}`;
  return `${pathname}${queryString}`;
};