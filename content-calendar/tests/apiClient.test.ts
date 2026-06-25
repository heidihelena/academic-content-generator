import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/lib/api';

function fetchOk(captured: { headers?: Record<string, string> }) {
  return vi.fn().mockImplementation((_url: string, init: { headers?: Record<string, string> }) => {
    captured.headers = init.headers;
    return Promise.resolve({ ok: true, text: async () => JSON.stringify({ ok: true }) });
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('ApiClient auth header', () => {
  it('sends Authorization: Bearer when a token is provided', async () => {
    const captured: { headers?: Record<string, string> } = {};
    vi.stubGlobal('fetch', fetchOk(captured));

    await new ApiClient('http://api', 'tok-123').get('/posts');
    expect(captured.headers?.authorization).toBe('Bearer tok-123');
    expect(captured.headers?.['content-type']).toBe('application/json');
  });

  it('omits Authorization when no token is configured', async () => {
    const captured: { headers?: Record<string, string> } = {};
    vi.stubGlobal('fetch', fetchOk(captured));

    // Explicit empty token (don't depend on import.meta.env in the test env).
    await new ApiClient('http://api', undefined).get('/posts');
    expect(captured.headers?.authorization).toBeUndefined();
  });
});
