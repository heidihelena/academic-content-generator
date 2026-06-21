/**
 * Minimal fetch wrapper used by the real platform clients. Parses JSON, and on a
 * non-2xx response throws an Error carrying the platform, status and body so
 * failures surface clearly in logs and on the post's `failureReason`.
 */
export async function apiFetch<T = any>(
  platform: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`${platform} API ${res.status}: ${detail}`);
  }
  return body as T;
}

/** application/x-www-form-urlencoded body for OAuth token endpoints. */
export function formBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export const FORM_HEADERS = { 'content-type': 'application/x-www-form-urlencoded' };
