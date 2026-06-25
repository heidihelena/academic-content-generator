import type { LlmClient, LlmCompletion } from '../llm-client';
import type { IdeaRequest } from '../ideas.types';
import { LlmIdeaGenerator } from './llm.generator';

const request: IdeaRequest = {
  niche: 'urban heat',
  audience: 'Researchers',
  tone: 'professional',
  platform: 'linkedin',
};

/** A stub {@link LlmClient} whose completeJson is driven by `complete`. */
function stubClient(complete: (req: LlmCompletion) => unknown): LlmClient {
  return {
    name: 'stub',
    completeJson: async <T>(req: LlmCompletion) => complete(req) as T,
  };
}

describe('LlmIdeaGenerator', () => {
  it('returns parsed ideas (capped at 5, each with an id) on success', async () => {
    const ideas = Array.from({ length: 7 }, (_, i) => ({
      topic: `Topic ${i}`,
      hook: `Hook ${i}`,
      platformFit: 'good',
      recommendedFormat: 'text post' as const,
    }));
    const gen = new LlmIdeaGenerator(stubClient(() => ({ ideas })));
    const out = await gen.generate(request, []);
    expect(out).toHaveLength(5);
    expect(out[0].id).toMatch(/^idea_/);
    expect(out[0].topic).toBe('Topic 0');
  });

  it('falls back to the mock generator on any error', async () => {
    const gen = new LlmIdeaGenerator(
      stubClient(() => {
        throw new Error('boom');
      }),
    );
    const out = await gen.generate(request, []);
    expect(out).toHaveLength(5); // the mock generator's deterministic 5 angles
    expect(out.every((i) => i.id.startsWith('idea_'))).toBe(true);
  });

  it('falls back when the completion has no ideas', async () => {
    const gen = new LlmIdeaGenerator(stubClient(() => ({ ideas: [] })));
    const out = await gen.generate(request, []);
    expect(out).toHaveLength(5); // the mock generator
  });
});
