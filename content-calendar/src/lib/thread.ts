/**
 * Thread composer.
 *
 * Researchers routinely need to turn a dense paragraph (an abstract, a key
 * finding) into a readable thread — especially on Bluesky (300 chars). This
 * splits copy into platform-sized parts on sentence boundaries (never
 * mid-word), numbering each "(i/n)". Deterministic and dependency-free.
 */

/** Characters reserved for the " (12/12)" style counter appended to each part. */
export const COUNTER_RESERVE = 8;

/** Split a sentence that is itself too long, on word boundaries. */
function splitLongSentence(sentence: string, max: number): string[] {
  const words = sentence.split(/\s+/);
  const parts: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= max) {
      current = candidate;
    } else {
      if (current) parts.push(current);
      // A single word longer than the limit gets hard-chopped.
      if (word.length > max) {
        let rest = word;
        while (rest.length > max) {
          parts.push(rest.slice(0, max));
          rest = rest.slice(max);
        }
        current = rest;
      } else {
        current = word;
      }
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Pack `text` into chunks of at most `max` characters, breaking on sentence
 * boundaries where possible and on word boundaries otherwise. No numbering is
 * added — callers that need "(i/n)" counters apply them afterwards.
 */
export function packToLimit(text: string, max: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const limit = Math.max(20, max);
  // Sentence-ish units, keeping the terminating punctuation.
  const sentences = trimmed.match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [trimmed];

  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const pieces = sentence.length > limit ? splitLongSentence(sentence, limit) : [sentence];
    for (const piece of pieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (candidate.length <= limit) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        current = piece;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Break `text` into chunks that each fit within `limit` characters once a
 * "(i/n)" counter is appended. Returns the original text as a single-element
 * array when it already fits (no counter added).
 */
export function splitIntoThread(text: string, limit: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= limit) return [trimmed];

  const chunks = packToLimit(trimmed, limit - COUNTER_RESERVE);
  return numberThread(chunks);
}

/** Append "(i/n)" counters to a list of parts (no-op for a single part). */
export function numberThread(parts: string[]): string[] {
  const n = parts.length;
  if (n <= 1) return parts;
  return parts.map((c, i) => `${c} (${i + 1}/${n})`);
}

/** How many parts `text` will become on a platform with the given `limit`. */
export function threadLength(text: string, limit: number): number {
  return splitIntoThread(text, limit).length;
}
