import { MockIdeaGenerator } from './mock.generator';
import type { IdeaRequest } from '../ideas.types';

const baseRequest: IdeaRequest = {
  niche: 'sustainable coffee',
  audience: 'home baristas',
  tone: 'bold',
  platform: 'instagram',
};

describe('MockIdeaGenerator', () => {
  const generator = new MockIdeaGenerator();

  it('always returns exactly 5 fully-formed ideas', async () => {
    const ideas = await generator.generate(baseRequest, []);
    expect(ideas).toHaveLength(5);
    for (const idea of ideas) {
      expect(idea.id).toMatch(/^idea_/);
      expect(idea.topic.length).toBeGreaterThan(0);
      expect(idea.hook.length).toBeGreaterThan(0);
      expect(idea.recommendedFormat).toBeTruthy();
    }
  });

  it('reflects the requested tone in the hook', async () => {
    const ideas = await generator.generate({ ...baseRequest, tone: 'bold' }, []);
    expect(ideas[0].hook.startsWith('Unpopular opinion:')).toBe(true);
  });

  it('recommends platform-appropriate formats for linkedin', async () => {
    const ideas = await generator.generate({ ...baseRequest, platform: 'linkedin' }, []);
    for (const idea of ideas) {
      expect(['text post', 'carousel', 'poll', 'single image']).toContain(idea.recommendedFormat);
    }
  });

  it('notes when ideas are grounded in vault context', async () => {
    const ideas = await generator.generate(baseRequest, ['some retrieved note']);
    expect(ideas[0].platformFit).toContain('grounded in your vault');
  });
});
