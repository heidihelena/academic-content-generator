import { describe, expect, it } from 'vitest';
import {
  CONTENT_CHANNELS,
  LocalIdeaLabClient,
  type IdeaSeed,
} from '../src/idea-lab/ideaLabClient';

const seed: IdeaSeed = {
  id: 'src_heat',
  title: 'Street trees and urban heat',
  material: 'Tree cover was associated with cooler streets and fewer heat-related ER visits.',
};

describe('LocalIdeaLabClient', () => {
  it('returns exactly five distinct ideas grounded in the source', async () => {
    const { ideas, sourceId, generator } = await new LocalIdeaLabClient().generate(seed);
    expect(sourceId).toBe('src_heat');
    expect(generator).toBe('local-template-v1');
    expect(ideas).toHaveLength(5);
    expect(new Set(ideas.map((i) => i.angle)).size).toBe(5);
    expect(ideas.every((i) => i.angle.includes('Street trees and urban heat'))).toBe(true);
    expect(ideas.every((i) => i.hook.includes('Tree cover'))).toBe(true);
  });

  it('assigns a valid channel per idea and honors the requested audience', async () => {
    const { ideas } = await new LocalIdeaLabClient().generate(seed, 'patients');
    expect(ideas.every((i) => CONTENT_CHANNELS.includes(i.channel))).toBe(true);
    expect(ideas.every((i) => i.audience === 'patients')).toBe(true);
  });

  it('defaults the audience to peers', async () => {
    const { ideas } = await new LocalIdeaLabClient().generate(seed);
    expect(ideas.every((i) => i.audience === 'peers')).toBe(true);
  });

  it('is deterministic for a given source', async () => {
    const a = await new LocalIdeaLabClient().generate(seed);
    const b = await new LocalIdeaLabClient().generate(seed);
    expect(a).toEqual(b);
  });

  it('truncates long material with an ellipsis and copes with empty material', async () => {
    const long = 'x'.repeat(300);
    const big = await new LocalIdeaLabClient().generate({ ...seed, material: long });
    expect(big.ideas[0].hook.endsWith('…')).toBe(true);

    const bare = await new LocalIdeaLabClient().generate({ id: 's', title: 'T', material: '   ' });
    expect(bare.ideas).toHaveLength(5);
    expect(bare.ideas[0].hook).not.toContain('…');
  });

  it('falls back to a placeholder title when blank', async () => {
    const { ideas } = await new LocalIdeaLabClient().generate({ id: 's', title: '  ', material: 'm' });
    expect(ideas[0].angle).toContain('this source');
  });
});
