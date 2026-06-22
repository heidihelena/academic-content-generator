/**
 * Fetch a YouTube transcript via the backend (the scrape must run server-side).
 *
 * Requires `VITE_API_URL` to be set; in pure local mode there's no backend, so
 * this throws a clear message and the user pastes the transcript manually —
 * the "verify, or redo" fallback.
 */
export interface FetchedTranscript {
  videoId: string;
  transcript: string;
  cueCount: number;
}

export async function fetchTranscript(url: string): Promise<FetchedTranscript> {
  const base = import.meta.env.VITE_API_URL as string | undefined;
  if (!base) {
    throw new Error('Transcript fetch needs the backend (VITE_API_URL). Paste the transcript instead.');
  }
  const res = await fetch(`${base}/shorts/transcript`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message = (body && (body.message || body.error)) || `Couldn't fetch transcript (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return body as FetchedTranscript;
}
