import { ApiClient } from './api';
import { getApiBaseUrl } from './connection';

/**
 * Provider (developer-app) credentials for OAuth platforms — the Client
 * ID/Secret a LinkedIn or X app issues. Saved to the backend, which stores
 * them encrypted on this machine; the API never returns the values, only
 * configured/not-configured booleans. API mode only.
 */
export async function fetchProviderCredentialStatus(
  client?: ApiClient,
): Promise<Partial<Record<string, boolean>>> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return {};
  const api = client ?? new ApiClient(baseUrl);
  return api.providerCredentials();
}

export async function saveProviderCredentials(
  platform: string,
  creds: { clientId: string; clientSecret: string },
  client?: ApiClient,
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('Connect the backend (set VITE_API_URL) to save app credentials.');
  const api = client ?? new ApiClient(baseUrl);
  await api.saveProviderCredentials(platform, creds);
}
