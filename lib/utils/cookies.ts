/**
 * @fileoverview Utilitaires de gestion des cookies HTTP.
 * Fournit des méthodes robustes, typées et sécurisées pour manipuler les cookies.
 */

/**
 * Extrait la valeur d'un cookie spécifique à partir d'un en-tête Cookie.
 *
 * @param cookieHeader - La chaîne brute de l'en-tête Cookie (ex: "name=value; other=thing").
 *                       Accepte `null` ou `undefined` pour une robustesse accrue.
 * @param name - Le nom exact du cookie à rechercher.
 * @returns La valeur du cookie si trouvée, sinon `null`.
 */
export function getCookieValue(
  cookieHeader: string | null | undefined,
  name: string
): string | null {
  if (!cookieHeader) return null;

  const prefix = `${name}=`;
  
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return null;

  // Retourne la valeur brute pour éviter tout problème de décodage intempestif 
  // sur les tokens de session (qui peuvent contenir des caractères spéciaux ou du Base64).
  return cookie.slice(prefix.length);
}

/**
 * Options standardisées pour la définition d'un cookie (Set-Cookie).
 */
export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

/**
 * Génère une chaîne de cookie prête à être assignée à l'en-tête Set-Cookie.
 *
 * @param name - Le nom du cookie.
 * @param value - La valeur du cookie.
 * @param options - Les options de configuration du cookie (sécurité, durée, etc.).
 * @returns Une chaîne formatée pour l'en-tête Set-Cookie.
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  // Encodage de la valeur pour garantir la conformité RFC 6265
  const encodedValue = encodeURIComponent(value);
  let cookieString = `${name}=${encodedValue}`;

  if (options.maxAge !== undefined) {
    cookieString += `; Max-Age=${Math.floor(options.maxAge)}`;
  }
  
  if (options.expires) {
    cookieString += `; Expires=${options.expires.toUTCString()}`;
  }
  
  if (options.path) {
    cookieString += `; Path=${options.path}`;
  } else {
    cookieString += `; Path=/`; // Valeur par défaut sécurisée et courante
  }
  
  if (options.domain) {
    cookieString += `; Domain=${options.domain}`;
  }
  
  if (options.secure) {
    cookieString += `; Secure`;
  }
  
  if (options.httpOnly) {
    cookieString += `; HttpOnly`;
  }
  
  if (options.sameSite) {
    cookieString += `; SameSite=${options.sameSite}`;
  }

  return cookieString;
}

/**
 * Génère une chaîne pour invalider et supprimer un cookie existant.
 *
 * @param name - Le nom du cookie à supprimer.
 * @param options - Les options (path, domain) doivent correspondre à celles du cookie original.
 * @returns Une chaîne formatée pour ordonner au navigateur de supprimer le cookie.
 */
export function deleteCookie(
  name: string,
  options: Pick<CookieOptions, "path" | "domain"> = {}
): string {
  return serializeCookie(name, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0), // 1er janvier 1970
  });
}

/**
 * Parse tous les cookies d'un en-tête en un objet clé-valeur typé.
 *
 * @param cookieHeader - La chaîne de l'en-tête Cookie.
 * @returns Un objet dictionnaire contenant les paires clé-valeur des cookies.
 */
export function parseCookies(
  cookieHeader: string | null | undefined
): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((part) => {
    const equalIndex = part.indexOf("=");
    if (equalIndex === -1) return;
    
    const name = part.slice(0, equalIndex).trim();
    const value = part.slice(equalIndex + 1).trim();
    
    if (name) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        // Fallback robuste (anti-fragile) en cas de valeur malformée ou non encodée
        cookies[name] = value;
      }
    }
  });

  return cookies;
}
