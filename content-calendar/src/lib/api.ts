/**
 * Thin HTTP client for the NestJS backend.
 *
 * The base URL comes from `VITE_API_URL` (e.g. http://localhost:3000/api). When
 * it is unset the app runs in local mode (sample data + localStorage) and this
 * client is never constructed — see `dataSource.ts`.
 */
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
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'content-type': 'application/json' },
      ...init,
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
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', body: form });
    const text = await res.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const message = (body && (body.message || body.error)) || `Upload failed (${res.status})`;
      throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
    }
    return body as T;
  }
}
