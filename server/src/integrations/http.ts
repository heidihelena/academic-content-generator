/**
 * Minimal fetch wrapper used by the real platform clients. Parses JSON, and on a
 * non-2xx response throws an Error carrying the platform, status and body so
 * failures surface clearly in logs and on the post's `failureReason`.
 */

const DETAIL_LIMIT = 300;

/**
 * Non-JSON error bodies are usually a website's error page (wrong host, proxy,
 * captive portal) — never dump a page of HTML into an error the UI shows.
 */
export function summarizeErrorBody(platform: string, text: string): string {
  const trimmed = text.trim();
  if (/^<(!doctype|html)/i.test(trimmed)) {
    return `got an HTML page instead of an API response — is that URL really a ${platform} server?`;
  }
  return trimmed.length > DETAIL_LIMIT ? `${trimmed.slice(0, DETAIL_LIMIT)}…` : trimmed;
}

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
    const detail =
      typeof body === 'string' ? summarizeErrorBody(platform, body) : JSON.stringify(body);
    throw new Error(`${platform} API ${res.status}: ${detail}`);
  }
  return body as T;
}

/** application/x-www-form-urlencoded body for OAuth token endpoints. */
export function formBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export const FORM_HEADERS = { 'content-type': 'application/x-www-form-urlencoded' };
