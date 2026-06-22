/**
 * Turn a long-form video transcript into a plan for short clips.
 *
 * Deterministic and dependency-free. When the transcript carries timestamps
 * (the usual YouTube "0:14 …" format), we derive real cut points; otherwise we
 * fall back to evenly splitting the text into N segments (no times). All scoring
 * reorganizes the transcript's OWN words — it never fabricates content.
 */

export interface Cue {
  /** Start time in seconds. */
  start: number;
  text: string;
}

export interface Segment {
  /** Start in seconds, or undefined when the transcript had no timestamps. */
  start?: number;
  end?: number;
  text: string;
}

/** Parse a "M:SS", "MM:SS" or "H:MM:SS" timestamp into seconds. */
export function parseTimestamp(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = m[3] !== undefined ? Number(m[3]) : null;
  if (b > 59 || (c !== null && c > 59)) return null;
  return c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
}

/** Format seconds as "M:SS" or "H:MM:SS". */
export function formatTimestamp(total: number): string {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

const TS_LINE = /^\[?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*\]?\s*(.*)$/;

/**
 * Parse a transcript into timestamped cues. Handles both inline
 * ("0:14 some text") and standalone-timestamp ("0:14\nsome text") layouts.
 * Returns [] when no timestamps are present.
 */
export function parseTranscript(text: string): Cue[] {
  const cues: Cue[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(TS_LINE);
    const ts = m ? parseTimestamp(m[1]) : null;
    if (m && ts !== null) {
      cues.push({ start: ts, text: m[2].trim() });
    } else if (cues.length > 0) {
      // Continuation of the previous cue.
      cues[cues.length - 1].text = `${cues[cues.length - 1].text} ${line}`.trim();
    }
  }
  return cues.filter((c) => c.text.length > 0);
}

/** Rough spoken duration of a chunk of text (~150 wpm => 0.4s/word). */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.round(words * 0.4));
}

/** Group consecutive cues into ~target-second windows (capped at max). */
function buildWindows(cues: Cue[], target = 40, max = 75): Segment[] {
  const windows: Segment[] = [];
  let i = 0;
  while (i < cues.length) {
    const start = cues[i].start;
    let j = i;
    while (
      j + 1 < cues.length &&
      cues[j + 1].start - start < target &&
      cues[j + 1].start - start < max
    ) {
      j += 1;
    }
    const text = cues.slice(i, j + 1).map((c) => c.text).join(' ').trim();
    const end = j + 1 < cues.length ? cues[j + 1].start : cues[j].start + estimateDuration(cues[j].text);
    windows.push({ start, end, text });
    i = j + 1;
  }
  return windows;
}

const SIGNAL =
  /\b(found|find|shows?|showed|reveal\w*|surprising|secret|mistake|why|how|best|worst|never|always|key|important|result\w*|increase\w*|decrease\w*|\d+\s?%|\d+(?:\.\d+)?\s?(?:x|fold|times)\b)/gi;

/** Score a chunk of text by how "clip-worthy" it looks. */
export function interestScore(text: string): number {
  const signals = (text.match(SIGNAL) ?? []).length;
  const questions = (text.match(/\?/g) ?? []).length;
  return signals + questions * 2;
}

/** Split plain text (no timestamps) into `count` roughly equal segments. */
export function splitPlainText(text: string, count: number): Segment[] {
  const sentences = (text.match(/[^.!?]+[.!?]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return [];
  const n = Math.max(1, Math.min(count, sentences.length));
  const per = Math.ceil(sentences.length / n);
  const segments: Segment[] = [];
  for (let i = 0; i < sentences.length; i += per) {
    segments.push({ text: sentences.slice(i, i + per).join(' ').trim() });
  }
  return segments.slice(0, n);
}

/**
 * Plan up to `count` short clips from a transcript. Timestamped transcripts
 * yield windows with real start/end times, ranked by interest; plain text falls
 * back to even segments. Selected windows are returned in chronological order.
 */
export function planShorts(transcript: string, count: number): Segment[] {
  const cues = parseTranscript(transcript);
  if (cues.length === 0) return splitPlainText(transcript, count);

  const windows = buildWindows(cues);
  if (windows.length <= count) return windows;

  return [...windows]
    .map((w, idx) => ({ w, idx, score: interestScore(w.text) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, count)
    .sort((a, b) => a.idx - b.idx)
    .map((x) => x.w);
}

/** First sentence of a chunk, trimmed for use as a title/hook. */
export function firstSentence(text: string): string {
  const m = text.match(/[^.!?]+[.!?]?/);
  return (m ? m[0] : text).trim();
}

/** Condense text to a title (<= maxLen, word boundary, no trailing punctuation). */
export function toTitle(text: string, maxLen = 70): string {
  const clean = firstSentence(text).replace(/[.,;:!?]+$/, '');
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 20 ? lastSpace : maxLen).trim()}…`;
}
