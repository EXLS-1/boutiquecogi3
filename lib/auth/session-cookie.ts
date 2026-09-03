const DEFAULT_COOKIE_PREFIX = "better-auth";

export function getAuthCookiePrefix(): string {
  return process.env.BETTER_AUTH_COOKIE_PREFIX || DEFAULT_COOKIE_PREFIX;
}

/** Cookie names shared by the Edge proxy and server-side session lookup. */
export function getSessionCookieNames(
  cookiePrefix = getAuthCookiePrefix(),
): string[] {
  const tokenCookie = `${cookiePrefix}.session_token`;
  const dataCookie = `${cookiePrefix}.session_data`;
  const names = [
    tokenCookie,
    `__Secure-${tokenCookie}`,
    dataCookie,
    `__Secure-${dataCookie}`,
  ];

  // Keep accepting the pre-existing underscore aliases during cookie migration.
  if (cookiePrefix === DEFAULT_COOKIE_PREFIX) {
    names.push("better_auth.session_token", "better_auth.session_data");
  }

  return names;
}

export function hasSessionCookieHeader(
  cookieHeader: string | null | undefined,
): boolean {
  if (!cookieHeader) return false;

  return getSessionCookieNames().some((name) => hasCookie(cookieHeader, name));
}

export function getSessionTokenFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;

  const tokenNames = getSessionCookieNames().filter((name) =>
    name.endsWith(".session_token"),
  );
  for (const name of tokenNames) {
    const value = getCookieValue(cookieHeader, name);
    if (value) return value;
  }

  return null;
}

function hasCookie(cookieHeader: string, name: string): boolean {
  return getCookieValue(cookieHeader, name) !== null;
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? cookie.slice(prefix.length) : null;
}
