// lib/utils/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ReadonlyURLSearchParams } from "next/navigation";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Vérifie de manière sûre la présence des variables d'environnement Supabase.
 */
export function checkSupabaseEnvVars(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url?.trim() && key?.trim());
}

export const hasEnvVars = checkSupabaseEnvVars();

/**
 * Fusionne proprement un pathname (pouvant contenir des query params/hash)
 * avec une instance de URLSearchParams sans corrumpre la structure de l'URL.
 */
export function createUrl(
  pathname: string,
  params: URLSearchParams | ReadonlyURLSearchParams
): string {
  if (!pathname) return "/";

  try {
    // Utilisation d'une URL de base fictive pour parser correctement les pathnames relatifs
    const dummyBase = "https://n";
    const url = new URL(pathname, dummyBase);

    // Injection/Mise à jour des paramètres
    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const queryString = url.searchParams.toString();
    const search = queryString ? `?${queryString}` : "";

    return `${url.pathname}${search}${url.hash}`;
  } catch {
    // Fallback de secours en cas d'URL malformée
    const paramsString = params.toString();
    const queryString = paramsString ? `?${paramsString}` : "";
    return `${pathname}${queryString}`;
  }
}