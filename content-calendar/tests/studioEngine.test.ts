import { describe, expect, it } from 'vitest';
import type { ApiClient } from '../src/lib/api';
import { ApiStudioEngine, LocalStudioEngine } from '../src/studio/studioEngine';
import type { StudioInput } from '../src/studio/studioTypes';

const input = (over: Partial<StudioInput> = {}): StudioInput => ({
  title: 'Sleep',
  material: 'Rest helps recall.',
  channel: 'linkedin',
  audience: 'peers',
  hook: '',
  ...over,
});

const fakeApi = (post: ApiClient['post']): ApiClient => ({ post } as unknown as ApiClient);

describe('LocalStudioEngine', () => {
  it('suggests, composes and reviews', async () => {
    const engine = new LocalStudioEngine();
    expect(await engine.suggestHook(input())).toBe('New from our work: Sleep');
    expect(await engine.compose(input())).toContain('Sleep');
    expect((await engine.review('This drug cures cancer.', 'peers')).cleared).toBe(false);
  });
});

describe('ApiStudioEngine', () => {
  it('composes locally (no API call) when there is no sourceId', async () => {
    let called = false;
    const engine = new ApiStudioEngine(
      fakeApi(async () => {
        called = true;
        return {} as never;
      }),
    );
    expect(await engine.compose(input())).toContain('Sleep');
    expect(called).toBe(false);
  });

  it('composes from the backend when a sourceId is present', async () => {
    const engine = new ApiStudioEngine(fakeApi(async () => ({ body: 'SERVER DRAFT' }) as never));
    expect(await engine.compose(input({ sourceId: 'src_1' }))).toBe('SERVER DRAFT');
  });

  it('suggests a hook from the backend with a sourceId, local without one', async () => {
    const engine = new ApiStudioEngine(fakeApi(async () => ({ hook: 'SERVER HOOK' }) as never));
    expect(await engine.suggestHook(input({ sourceId: 'src_1' }))).toBe('SERVER HOOK');
    expect(await engine.suggestHook(input())).toBe('New from our work: Sleep');
  });

  it('falls back to the local composer when the API call fails', async () => {
    const engine = new ApiStudioEngine(
      fakeApi(async () => {
        throw new Error('boom');
      }),
    );
    expect(await engine.compose(input({ sourceId: 'src_1' }))).toContain('Sleep');
  });

  it('reviews via the API, and falls back to the local reviewer on error', async () => {
    const ok = new ApiStudioEngine(
      fakeApi(async () =>
        ({
          claims: [],
          findings: [{ severity: 'block', category: 'overclaiming', message: 'x' }],
          cleared: false,
        }) as never),
    );
    expect((await ok.review('body', 'peers')).cleared).toBe(false);

    const down = new ApiStudioEngine(
      fakeApi(async () => {
        throw new Error('down');
      }),
    );
    // Local fallback still applies patient-facing escalation for `public`.
    expect((await down.review('Coffee causes weight loss.', 'public')).cleared).toBe(false);
  });
});
