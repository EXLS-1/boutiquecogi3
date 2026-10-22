/**
 * Proxy client : intercepte les réponses API admin et redirige
 * automatiquement si la 2FA est requise mais non vérifiée.
 */
const TWO_FACTOR_PATH = '/admin/verify-2fa';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorDetails(
  payload: unknown,
  status: number,
  statusText: string
): { code: string; message: string } {
  if (typeof payload === 'string' && payload) {
    return { code: `HTTP_${status}`, message: payload };
  }

  const error = isRecord(payload) ? payload.error : undefined;
  const payloadCode = isRecord(payload) ? payload.code : undefined;
  const payloadMessage = isRecord(payload) ? payload.message : undefined;
  const code =
    (typeof payloadCode === 'string' && payloadCode) ||
    (typeof error === 'string' && error) ||
    `HTTP_${status}`;
  const message =
    (typeof payloadMessage === 'string' && payloadMessage) ||
    (typeof error === 'string' && error) ||
    statusText ||
    'Request failed';

  return { code, message };
}

async function readResponseBody(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) return undefined;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

export class APIError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export async function apiClient<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(
    typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined
  );
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));

  if (typeof init?.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
  const data = await readResponseBody(res);

  if (res.status === 403) {
    const errorCode = isRecord(data) ? data.code : undefined;
    const error = isRecord(data) ? data.error : undefined;
    if (
      errorCode === '2FA_REQUIRED' ||
      errorCode === '2FA_UNVERIFIED' ||
      error === '2FA_REQUIRED' ||
      error === '2FA_UNVERIFIED'
    ) {
      if (typeof window !== 'undefined' && window.location.pathname !== TWO_FACTOR_PATH) {
        window.location.assign(new URL(TWO_FACTOR_PATH, window.location.origin).href);
      }
      throw new APIError(403, '2FA_REQUIRED', '2FA verification required');
    }
  }

  if (!res.ok) {
    const { code, message } = getErrorDetails(data, res.status, res.statusText);
    throw new APIError(res.status, code, message);
  }

  return data as T;
}
