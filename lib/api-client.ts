/**
 * Proxy client : intercepte les réponses API admin et redirige
 * automatiquement si la 2FA est requise mais non vérifiée.
 */
export class APIError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function apiClient<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (res.status === 403) {
    const data = await res.clone().json().catch(() => ({}));
    if (data.error === '2FA_REQUIRED' || data.error === '2FA_UNVERIFIED') {
      window.location.assign('/admin/verify-2fa');
      throw new APIError(403, '2FA_REQUIRED', '2FA verification required');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new APIError(res.status, err.error, err.message || err.error);
  }

  return res.json() as Promise<T>;
}
