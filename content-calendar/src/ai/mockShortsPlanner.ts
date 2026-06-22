import type { ShortIdea, ShortsPlanner, ShortsPlanResult, ShortsRequest } from './shortsTypes';
import {
  firstSentence,
  formatTimestamp,
  interestScore,
  planShorts,
  toTitle,
  type Segment,
} from '../lib/shorts';
import { createId } from '../lib/id';
import { buildShortsUserPrompt } from './shortsPrompt';

/**
 * Deterministic, offline Video → Shorts planner.
 *
 * It segments the transcript (by its own timestamps when present), ranks the
 * segments by interest, and turns each into a clip card: a title, a hook, a
 * caption, and — when the transcript was timestamped — real start/end cut
 * points. It reorganizes the transcript's words; it never invents content.
 */

/** Pick the highest-interest sentence in a segment as the hook (fallback: first). */
function hookFor(text: string): string {
  const sentences = (text.match(/[^.!?]+[.!?]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return firstSentence(text);
  return sentences.reduce((best, s) => (interestScore(s) > interestScore(best) ? s : best), sentences[0]);
}

function shortFromSegment(seg: Segment): ShortIdea {
  const hook = hookFor(seg.text);
  const caption = seg.text.length > 500 ? `${seg.text.slice(0, 497).trimEnd()}…` : seg.text;
  const hasTimes = seg.start !== undefined && seg.end !== undefined;
  return {
    id: createId('short'),
    title: toTitle(hook),
    hook,
    caption,
    startSeconds: seg.start,
    endSeconds: seg.end,
    timeRange: hasTimes ? `${formatTimestamp(seg.start!)}–${formatTimestamp(seg.end!)}` : undefined,
  };
}

export class MockShortsPlanner implements ShortsPlanner {
  readonly name = 'mock-shorts-planner-v1';

  async plan(request: ShortsRequest): Promise<ShortsPlanResult> {
    // Build the prompt even though we don't send it — mirrors a real client.
    void buildShortsUserPrompt(request);

    if (!request.transcript.trim()) {
      throw new Error('Paste a transcript to plan shorts.');
    }
    const count = Math.max(1, Math.min(request.count || 3, 10));

    // Simulate model latency so the UI's loading state is exercised.
    await new Promise((r) => setTimeout(r, 600));

    const segments = planShorts(request.transcript, count);
    const shorts = segments.map(shortFromSegment);
    return { request, shorts, source: this.name };
  }
}
