import { describe, expect, it, vi } from 'vitest';
import { ApiClient, type HealthReport } from '../src/lib/api';
import { checkConnection } from '../src/lib/connection';

const REPORT: HealthReport = {
  status: 'ok',
  uptime: 12,
  config: {
    persistence: 'sqlite',
    aiGenerator: 'llm',
    aiProvider: 'ollama',
    embeddings: 'mock',
    storage: 'local',
  },
};

describe('ApiClient.health', () => {
  it('GETs /health and returns the report', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(REPORT),
    });
    vi.stubGlobal('fetch', fetchMock);

    const report = await new ApiClient('http://localhost:3000/api').health();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/health', expect.any(Object));
    expect(report.config.aiProvider).toBe('ollama');

    vi.unstubAllGlobals();
  });
});

describe('checkConnection', () => {
  it('reports api/online with the backend modes when the probe succeeds', async () => {
    const client = {
      health: vi.fn().mockResolvedValue(REPORT),
      me: vi.fn().mockResolvedValue({ userId: 'alice', authEnabled: true }),
    } as unknown as ApiClient;
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');

    const status = await checkConnection(client);
    expect(status).toEqual({
      mode: 'api',
      online: true,
      baseUrl: 'http://localhost:3000/api',
      backend: REPORT.config,
      user: { userId: 'alice', authEnabled: true },
    });

    vi.unstubAllEnvs();
  });

  it('stays online with no user when /me 401s (auth on, no token)', async () => {
    const client = {
      health: vi.fn().mockResolvedValue(REPORT),
      me: vi.fn().mockRejectedValue(new Error('401')),
    } as unknown as ApiClient;
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');

    const status = await checkConnection(client);
    expect(status.online).toBe(true);
    expect(status.user).toBeUndefined();

    vi.unstubAllEnvs();
  });

  it('reports api/offline (not throwing) when the backend is unreachable', async () => {
    const client = { health: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) } as unknown as ApiClient;
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');

    const status = await checkConnection(client);
    expect(status.mode).toBe('api');
    expect(status.online).toBe(false);
    expect(status.backend).toBeUndefined();

    vi.unstubAllEnvs();
  });

  it('reports local mode when no API URL is configured', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const status = await checkConnection();
    expect(status).toEqual({ mode: 'local', online: true });
    vi.unstubAllEnvs();
  });
});
