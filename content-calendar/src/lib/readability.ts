/**
 * Plain-language check.
 *
 * Academics write for peers by default; this estimates how accessible a post is
 * to a general audience and surfaces the longest/most complex words so the
 * author can swap jargon for plainer wording. Everything here is a deterministic
 * heuristic (no dependencies) so it's fast and fully testable.
 */

export interface Readability {
  /** Flesch–Kincaid grade level (US school grade). Lower = more accessible. */
  gradeLevel: number;
  wordCount: number;
  sentenceCount: number;
  /** Words of 4+ syllables — the usual jargon culprits, de-duplicated. */
  complexWords: string[];
}

export interface ReadabilityVerdict {
  tone: 'good' | 'warn' | 'empty';
  message: string;
}

/** Strip URLs, @mentions and #hashtags so they don't skew the score. */
function clean(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#]\S+/g, ' ');
}

/** Heuristic syllable count for an English word. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Analyze a post body for accessibility. */
export function analyzeReadability(text: string): Readability {
  const cleaned = clean(text);
  const words = cleaned.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const sentences = cleaned.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);

  let syllables = 0;
  const complex = new Map<string, true>();
  for (const word of words) {
    const s = countSyllables(word);
    syllables += s;
    if (s >= 4) complex.set(word.toLowerCase(), true);
  }

  const gradeLevel =
    wordCount === 0
      ? 0
      : 0.39 * (wordCount / sentenceCount) + 11.8 * (syllables / wordCount) - 15.59;

  return {
    gradeLevel: Math.max(0, Math.round(gradeLevel * 10) / 10),
    wordCount,
    sentenceCount,
    complexWords: [...complex.keys()],
  };
}

/**
 * Turn a reading-grade into a friendly verdict. ~9 and below reads for a broad
 * public audience; 13+ (college level) is a nudge to simplify for outreach.
 */
export function readabilityVerdict(r: Readability): ReadabilityVerdict {
  if (r.wordCount < 10) {
    return { tone: 'empty', message: 'Write a bit more to check readability.' };
  }
  if (r.gradeLevel <= 9) {
    return { tone: 'good', message: 'Reads clearly for a general audience.' };
  }
  if (r.gradeLevel <= 12) {
    return { tone: 'warn', message: 'High-school+ reading level — fine for peers, a little dense for the public.' };
  }
  return { tone: 'warn', message: 'College-level reading — consider simplifying for a broad audience.' };
}
