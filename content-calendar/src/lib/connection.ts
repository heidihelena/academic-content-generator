import { ApiClient, type HealthReport } from './api';

/**
 * Frontend ↔ backend connection check.
 *
 * The app runs in one of two modes, chosen by `VITE_API_URL` (the same switch
 * `dataSource.ts` uses): `local` (sample data + localStorage, fully offline) or
 * `api` (the NestJS backend). In API mode this pings `GET /api/health` so the UI
 * can confirm the backend is actually reachable and show which backends are live
 * — verification that the wiring works, not just that a URL is set.
 */
export type ConnectionMode = 'local' | 'api';

export interface ConnectionStatus {
  mode: ConnectionMode;
  /** API mode only: did the health probe succeed? Always true for local. */
  online: boolean;
  /** The configured backend base URL (API mode). */
  baseUrl?: string;
  /** Active backend modes from the health probe (API mode, when online). */
  backend?: HealthReport['config'];
}

export function getApiBaseUrl(): string | undefined {
  return import.meta.env.VITE_API_URL as string | undefined;
}

export function isApiMode(): boolean {
  return Boolean(getApiBaseUrl());
}

/**
 * Resolve the current connection status. In local mode this returns immediately;
 * in API mode it probes `/api/health` and reports `online:false` if the backend
 * is unreachable (rather than throwing), so the UI can degrade gracefully.
 */
export async function checkConnection(client?: ApiClient): Promise<ConnectionStatus> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { mode: 'local', online: true };

  const api = client ?? new ApiClient(baseUrl);
  try {
    const report = await api.health();
    return { mode: 'api', online: true, baseUrl, backend: report.config };
  } catch {
    return { mode: 'api', online: false, baseUrl };
  }
}
