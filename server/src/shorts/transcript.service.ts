import { BadRequestException, Injectable, Logger } from '@nestjs/common';

/**
 * Fetches a YouTube transcript for the "Video → Shorts" planner so academics
 * don't have to copy-paste it. The network fetch is best-effort (YouTube has no
 * stable public transcript API — we read the watch page's caption track); the
 * pure parsing/extraction below is fully unit-tested. Callers always have the
 * manual paste fallback if a fetch fails (the "verify, or redo" path).
 */

export interface TranscriptCue {
  /** Start time in seconds. */
  start: number;
  text: string;
}

export interface TranscriptResult {
  videoId: string;
  /** Timestamped lines ("M:SS text") the frontend planner can parse directly. */
  transcript: string;
  cueCount: number;
}

/** Extract the 11-char video id from any common YouTube URL shape. */
export function extractVideoId(url: string): string | null {
  const id = /[A-Za-z0-9_-]{11}/;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // A bare id pasted on its own.
  const bare = url.trim();
  if (id.test(bare) && bare.length === 11) return bare;
  return null;
}

/** Decode the handful of HTML entities YouTube uses in caption text. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Parse YouTube timedtext XML into cues. */
export function parseTimedText(xml: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  const re = /<text[^>]*\bstart="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const start = Math.floor(parseFloat(m[1]));
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (text) cues.push({ start, text });
  }
  return cues;
}

/** Format seconds as "M:SS" or "H:MM:SS". */
export function formatClock(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Render cues as timestamped lines the Shorts planner can parse. */
export function toTimestampedTranscript(cues: TranscriptCue[]): string {
  return cues.map((c) => `${formatClock(c.start)} ${c.text}`).join('\n');
}

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  async fetch(url: string): Promise<TranscriptResult> {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new BadRequestException('That doesn\'t look like a YouTube URL.');
    }

    let cues: TranscriptCue[] = [];
    try {
      // 1. Read the watch page and find the caption track URL.
      const page = await this.text(`https://www.youtube.com/watch?v=${videoId}&hl=en`);
      const match = page.match(/"captionTracks":(\[.*?\])/);
      if (match) {
        const tracks = JSON.parse(match[1]) as Array<{ baseUrl: string; languageCode?: string }>;
        const track = tracks.find((t) => t.languageCode?.startsWith('en')) ?? tracks[0];
        if (track?.baseUrl) {
          const xml = await this.text(track.baseUrl.replace(/\\u0026/g, '&'));
          cues = parseTimedText(xml);
        }
      }
    } catch (err) {
      this.logger.warn(`Transcript fetch failed for ${videoId}: ${err instanceof Error ? err.message : err}`);
    }

    if (cues.length === 0) {
      throw new BadRequestException(
        'Couldn\'t fetch captions for this video (it may have none, or be restricted). Paste the transcript instead.',
      );
    }
    return { videoId, transcript: toTimestampedTranscript(cues), cueCount: cues.length };
  }

  private async text(url: string): Promise<string> {
    const res = await fetch(url, { headers: { 'accept-language': 'en' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
}
