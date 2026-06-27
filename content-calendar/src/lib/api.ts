/**
 * Thin HTTP client for the NestJS backend.
 *
 * The base URL comes from `VITE_API_URL` (e.g. http://localhost:3000/api). When
 * it is unset the app runs in local mode (sample data + localStorage) and this
 * client is never constructed — see `dataSource.ts`.
 */
/** The backend's `/api/health` report — active backend modes, never secrets. */
export interface HealthReport {
  status: 'ok';
  uptime: number;
  config: {
    persistence: string;
    aiGenerator: string;
    aiProvider: string;
    embeddings: string;
    storage: string;
  };
}

/** The backend's `/api/me` response — the authenticated identity. */
export interface MeResponse {
  userId: string;
  authEnabled: boolean;
}

/**
 * Writable local settings (`/api/settings`) — the local-Mac paths the Connections
 * panel persists to `~/forskai/settings.json` without hand-editing `.env`.
 * Non-secret only: keys/tokens are never stored here (the backend drops them).
 */
export interface LocalSettings {
  vaultPath?: string;
  persistenceDriver?: string;
  sqlitePath?: string;
}

/** How a publishing destination is connected. */
export type ConnectMethod = 'oauth' | 'app-password' | 'access-token' | 'api-key';

/** A content-generation backend's mode and whether it's live (real key present). */
export interface ProviderStatus {
  active: string;
  live: boolean;
}

/** A publishing destination and whether its credentials are configured. */
export interface SocialStatus {
  platform: string;
  method: ConnectMethod;
  configured: boolean;
}

/**
 * The backend's `/api/connections` report — a secret-safe snapshot of every
 * connection for the Connections panel. Modes and booleans only, never secrets.
 */
export interface ConnectionsReport {
  inputs: {
    vaultPath: string;
    persistenceDriver: string;
    sqlitePath: string;
  };
  providers: {
    llm: ProviderStatus;
    voice: ProviderStatus;
    video: ProviderStatus;
    embeddings: ProviderStatus;
  };
  social: SocialStatus[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    /** Bearer token sent on every request when the backend has auth enabled.
     *  Defaults to VITE_API_TOKEN; omitted entirely when unset (open backend). */
    private readonly token: string | undefined = import.meta.env.VITE_API_TOKEN as
      | string
      | undefined,
  ) {}

  private authHeaders(): Record<string, string> {
    return this.token ? { authorization: `Bearer ${this.token}` } : {};
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...this.authHeaders(),
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const message =
        (body && (body.message || body.error)) || `Request failed (${res.status})`;
      throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
    }
    return body as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  /** Liveness/readiness probe — GET /health on the backend. */
  health(): Promise<HealthReport> {
    return this.request<HealthReport>('/health');
  }

  /** The authenticated identity — GET /me on the backend. */
  me(): Promise<MeResponse> {
    return this.request<MeResponse>('/me');
  }

  /** Secret-safe connection status — GET /connections on the backend. */
  connections(): Promise<ConnectionsReport> {
    return this.request<ConnectionsReport>('/connections');
  }

  /** The saved writable local settings — GET /settings on the backend. */
  settings(): Promise<LocalSettings> {
    return this.request<LocalSettings>('/settings');
  }

  /** Persist local settings (merge) — PUT /settings on the backend. */
  saveSettings(patch: LocalSettings): Promise<LocalSettings> {
    return this.request<LocalSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  }
  post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined });
  }
  patch<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  /** Multipart upload — lets the browser set the multipart boundary header. */
  async upload<T>(path: string, file: File): Promise<T> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      body: form,
      headers: this.authHeaders(),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const message = (body && (body.message || body.error)) || `Upload failed (${res.status})`;
      throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
    }
    return body as T;
  }
}
