import { ApiClient, type ConnectionsReport } from './api';
import { getApiBaseUrl } from './connection';

/**
 * The Connections panel's snapshot. In API mode it fetches `/api/connections`
 * from the backend; in local mode (no `VITE_API_URL`) it returns a sensible
 * disconnected local default so the panel still renders offline.
 */
export interface ConnectionsState {
  mode: 'local' | 'api';
  /** API mode only: did the probe succeed? Always true for local. */
  online: boolean;
  report: ConnectionsReport;
}

/** The default report shown in local mode (zero-config, no real account tokens). */
export const LOCAL_CONNECTIONS_REPORT: ConnectionsReport = {
  inputs: { vaultPath: './vault', persistenceDriver: 'memory', sqlitePath: '' },
  providers: {
    llm: { active: 'mock', live: false },
    voice: { active: 'mock', live: false },
    video: { active: 'mock', live: false },
    embeddings: { active: 'mock', live: false },
  },
  social: [
    { platform: 'bluesky', method: 'app-password', configured: false, connected: false },
    { platform: 'mastodon', method: 'access-token', configured: false, connected: false },
    { platform: 'linkedin', method: 'oauth', configured: false, connected: false },
    { platform: 'instagram', method: 'oauth', configured: false, connected: false },
    { platform: 'threads', method: 'oauth', configured: false, connected: false },
    { platform: 'x', method: 'oauth', configured: false, connected: false },
  ],
};

/**
 * Resolve the Connections panel state. Local mode returns immediately; API mode
 * probes `/api/connections` and degrades to the local default (with
 * `online:false`) if the backend is unreachable, so the panel never throws.
 */
export async function fetchConnectionsState(client?: ApiClient): Promise<ConnectionsState> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { mode: 'local', online: true, report: LOCAL_CONNECTIONS_REPORT };

  const api = client ?? new ApiClient(baseUrl);
  try {
    const report = await api.connections();
    return { mode: 'api', online: true, report };
  } catch {
    return { mode: 'api', online: false, report: LOCAL_CONNECTIONS_REPORT };
  }
}
