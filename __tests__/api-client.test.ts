import { afterEach, describe, expect, it, vi } from 'vitest';
import { APIError, apiClient } from '@/lib/api-client';

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('merges request headers, sets JSON content type for string bodies, and handles empty responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiClient('/api/admin/2fa/disable', {
        method: 'POST',
        body: '{}',
        headers: new Headers({ 'X-Request-Id': 'request-1' }),
      })
    ).resolves.toBeUndefined();

    const [, requestInit] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    const headers = new Headers(requestInit.headers);
    expect(requestInit.credentials).toBe('include');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Request-Id')).toBe('request-1');
  });

  it('normalizes structured API errors without losing their code or message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          { code: 'RATE_LIMITED', message: 'Réessayez plus tard' },
          { status: 429 }
        )
      )
    );

    await expect(apiClient('/api/admin/2fa/verify')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Réessayez plus tard',
    });
  });

  it('surfaces the 2FA challenge as a stable APIError outside the browser', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ error: '2FA_REQUIRED' }, { status: 403 }))
    );

    const request = apiClient('/api/admin/2fa/check-status');
    await expect(request).rejects.toBeInstanceOf(APIError);
    await expect(request).rejects.toMatchObject({
      status: 403,
      code: '2FA_REQUIRED',
      message: '2FA verification required',
    });
  });
});
