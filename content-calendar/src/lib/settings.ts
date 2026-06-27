import { ApiClient, type LocalSettings } from './api';
import { getApiBaseUrl } from './connection';

/**
 * Read/write the writable local settings (the local-Mac paths the Connections
 * panel manages). API mode only: there is no settings file to persist to in
 * local mode, so `fetchSettings` returns `{}` and `saveSettings` rejects with a
 * clear message rather than silently doing nothing.
 */
export async function fetchSettings(client?: ApiClient): Promise<LocalSettings> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return {};
  const api = client ?? new ApiClient(baseUrl);
  return api.settings();
}

export async function saveSettings(patch: LocalSettings, client?: ApiClient): Promise<LocalSettings> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('Connect the backend (set VITE_API_URL) to save settings.');
  const api = client ?? new ApiClient(baseUrl);
  return api.saveSettings(patch);
}
