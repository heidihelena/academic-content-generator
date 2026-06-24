import { NotFoundException } from '@nestjs/common';
import type { IdeaGenerator, IdeaRequest, PostIdea } from '../ai/ideas.types';
import { InMemorySourcesRepository } from '../sources/sources.repository';
import { SourcesService } from '../sources/sources.service';
import { IdeaLabService } from './idea-lab.service';

class StubGenerator implements IdeaGenerator {
  readonly name = 'stub';
  lastContext: string[] = [];
  async generate(_request: IdeaRequest, context: string[]): Promise<PostIdea[]> {
    this.lastContext = context;
    return Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      topic: `Topic ${i}`,
      hook: `Hook ${i}`,
      platformFit: 'fits',
      recommendedFormat: 'text post' as const,
    }));
  }
}

const emptyVault = { listNotes: async () => [], getNote: async () => null } as never;

function setup() {
  const sources = new SourcesService(new InMemorySourcesRepository(), emptyVault);
  const generator = new StubGenerator();
  const service = new IdeaLabService(generator, sources);
  return { sources, generator, service };
}

describe('IdeaLabService', () => {
  it('generates 5 ideas from a source, each with a channel and audience', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'paper', title: 'Sleep', abstract: 'rest matters' });
    const result = await service.generate(src.id, 'students');

    expect(result.sourceId).toBe(src.id);
    expect(result.generator).toBe('stub');
    expect(result.ideas).toHaveLength(5);
    for (const idea of result.ideas) {
      expect(idea.id).toMatch(/^idea_/);
      expect(idea.audience).toBe('students');
      expect(['linkedin', 'threads', 'instagram', 'newsletter', 'teaching']).toContain(idea.channel);
    }
    // a distinct suggested channel per idea
    expect(new Set(result.ideas.map((i) => i.channel)).size).toBe(5);
  });

  it('passes the source title/abstract/tags to the generator as context', async () => {
    const { sources, generator, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Hippocampus',
      abstract: 'memory consolidation',
      tags: ['neuro'],
    });
    await service.generate(src.id);
    const joined = generator.lastContext.join(' ');
    expect(joined).toContain('Hippocampus');
    expect(joined).toContain('memory consolidation');
    expect(joined).toContain('neuro');
  });

  it('defaults to the peers audience and falls back when given an invalid one', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X' });
    expect((await service.generate(src.id)).ideas[0].audience).toBe('peers');
    expect((await service.generate(src.id, 'bogus' as never)).ideas[0].audience).toBe('peers');
  });

  it('throws NotFound for an unknown source', async () => {
    const { service } = setup();
    await expect(service.generate('src_missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
