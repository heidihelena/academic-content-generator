import { generateIdeasFromSource, type AcademicIdea } from '../idea-lab/ideaLabClient';
import { generateCarousel, type CarouselResult } from '../carousel/carouselClient';
import { draftThread } from '../ai/threadService';
import type { Audience } from '../content/contentTypes';

/**
 * Repurpose — fan one source out into every output format at once (ideas,
 * carousel deck, thread), so the same content is optimized into different
 * formats directly rather than one tool at a time. Composes the existing
 * per-format facades; each runs independently and a failure in one never sinks
 * the others (the local fallbacks make failures rare, but API mode can error).
 */

/** The minimum a source needs to be repurposed. */
export interface RepurposeSeed {
  id: string;
  title: string;
  material: string;
  /** DOI/URL appended as the thread's closing "read more" line, when present. */
  sourceUrl?: string;
}

/** One format's outcome — succeeded with data, or failed with a message. */
export type FormatOutcome<T> = { status: 'ok'; data: T } | { status: 'error'; message: string };

export interface RepurposeResult {
  ideas: FormatOutcome<AcademicIdea[]>;
  carousel: FormatOutcome<CarouselResult>;
  thread: FormatOutcome<string[]>;
}

async function settle<T>(work: Promise<T>): Promise<FormatOutcome<T>> {
  try {
    return { status: 'ok', data: await work };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Failed.' };
  }
}

/**
 * Run all formats concurrently. `audience` seeds the ideas/carousel safety voice
 * (defaults to `peers`); the thread defaults to a general-public framing since
 * that is its most common repurposing target.
 */
export async function repurposeSource(
  seed: RepurposeSeed,
  audience: Audience = 'peers',
): Promise<RepurposeResult> {
  const [ideas, carousel, thread] = await Promise.all([
    settle(generateIdeasFromSource(seed, audience).then((r) => r.ideas)),
    settle(generateCarousel({ id: seed.id, title: seed.title, material: seed.material, audience })),
    settle(
      draftThread({
        abstract: seed.material,
        audience: 'general public',
        platform: 'bluesky',
        sourceUrl: seed.sourceUrl,
      }).then((r) => r.parts),
    ),
  ]);
  return { ideas, carousel, thread };
}
