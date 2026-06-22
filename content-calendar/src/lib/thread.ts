/**
 * Thread composer.
 *
 * Researchers routinely need to turn a dense paragraph (an abstract, a key
 * finding) into a readable thread — especially on Bluesky (300 chars). This
 * splits copy into platform-sized parts on sentence boundaries (never
 * mid-word), numbering each "(i/n)". Deterministic and dependency-free.
 */

/** Characters reserved for the " (12/12)" style counter appended to each part. */
const COUNTER_RESERVE = 8;

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
 * Break `text` into chunks that each fit within `limit` characters once a
 * "(i/n)" counter is appended. Returns the original text as a single-element
 * array when it already fits (no counter added).
 */
export function splitIntoThread(text: string, limit: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= limit) return [trimmed];

  const max = Math.max(20, limit - COUNTER_RESERVE);
  // Sentence-ish units, keeping the terminating punctuation.
  const sentences = trimmed.match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [trimmed];

  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const pieces = sentence.length > max ? splitLongSentence(sentence, max) : [sentence];
    for (const piece of pieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (candidate.length <= max) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        current = piece;
      }
    }
  }
  if (current) chunks.push(current);

  const n = chunks.length;
  if (n <= 1) return chunks;
  return chunks.map((c, i) => `${c} (${i + 1}/${n})`);
}

/** How many parts `text` will become on a platform with the given `limit`. */
export function threadLength(text: string, limit: number): number {
  return splitIntoThread(text, limit).length;
}
