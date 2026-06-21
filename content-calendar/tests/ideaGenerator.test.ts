import { describe, expect, it, vi } from 'vitest';
import { MockIdeaGenerator } from '../src/ai/mockIdeaGenerator';
import { generateIdeas, getIdeaGenerator, setIdeaGenerator } from '../src/ai/ideaService';
import { buildIdeaMessages, buildIdeaUserPrompt, IDEA_SYSTEM_PROMPT } from '../src/ai/prompt';
import type { IdeaGenerator, IdeaRequest } from '../src/ai/types';

const request: IdeaRequest = {
  niche: 'Sustainable fashion',
  audience: 'Eco-conscious millennials',
  tone: 'bold',
  platform: 'instagram',
};

describe('AI idea generation', () => {
  it('returns exactly 5 fully-structured ideas', async () => {
    const generator = new MockIdeaGenerator();
    const promise = generator.generate(request);
    // Generator simulates latency; advance fake timers to resolve it.
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ideas).toHaveLength(5);
    for (const idea of result.ideas) {
      expect(idea.topic.length).toBeGreaterThan(0);
      expect(idea.hook.length).toBeGreaterThan(0);
      expect(idea.platformFit.length).toBeGreaterThan(0);
      expect(idea.recommendedFormat).toBeTruthy();
      expect(idea.id).toBeTruthy();
    }
    expect(result.source).toBe('mock-generator-v1');
  });

  it('reflects the requested tone in the hooks', async () => {
    const generator = new MockIdeaGenerator();
    const promise = generator.generate({ ...request, tone: 'bold' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ideas[0].hook.startsWith('Unpopular opinion:')).toBe(true);
  });

  it('recommends platform-appropriate formats', async () => {
    const generator = new MockIdeaGenerator();
    const promise = generator.generate({ ...request, platform: 'linkedin' });
    await vi.runAllTimersAsync();
    const result = await promise;
    // LinkedIn idea formats never include Instagram-only "reel"/"story".
    for (const idea of result.ideas) {
      expect(['text post', 'carousel', 'poll', 'single image']).toContain(idea.recommendedFormat);
    }
  });

  it('throws a helpful error when inputs are missing', async () => {
    const generator = new MockIdeaGenerator();
    const promise = generator.generate({ ...request, niche: '  ' });
    // Attach the rejection assertion before advancing timers so the rejection
    // is never observed as "unhandled".
    const expectation = expect(promise).rejects.toThrow(/niche and a target audience/);
    await vi.runAllTimersAsync();
    await expectation;
  });

  it('service facade delegates to the active generator and is swappable', async () => {
    const fake: IdeaGenerator = {
      name: 'fake',
      generate: vi.fn().mockResolvedValue({ request, ideas: [], source: 'fake' }),
    };
    const previous = getIdeaGenerator();
    setIdeaGenerator(fake);
    const result = await generateIdeas(request);
    expect(fake.generate).toHaveBeenCalledWith(request);
    expect(result.source).toBe('fake');
    setIdeaGenerator(previous); // restore
  });
});

describe('AI prompt construction', () => {
  it('system prompt enforces exactly 5 JSON ideas', () => {
    expect(IDEA_SYSTEM_PROMPT).toMatch(/exactly 5/);
    expect(IDEA_SYSTEM_PROMPT).toMatch(/JSON/);
  });

  it('user prompt embeds all request fields and the platform limit', () => {
    const prompt = buildIdeaUserPrompt(request);
    expect(prompt).toContain('Sustainable fashion');
    expect(prompt).toContain('Eco-conscious millennials');
    expect(prompt).toContain('bold');
    expect(prompt).toContain('Instagram');
    expect(prompt).toContain('2200'); // Instagram character limit
  });

  it('buildIdeaMessages returns system + user messages', () => {
    const messages = buildIdeaMessages(request);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });
});
