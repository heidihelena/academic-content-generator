import { InMemorySourcesRepository } from '../sources/sources.repository';
import { SourcesService } from '../sources/sources.service';
import { ContentPlanService, shorten, splitSentences } from './content-plan.service';

const emptyVault = { listNotes: async () => [], getNote: async () => null } as never;

function setup() {
  const sources = new SourcesService(new InMemorySourcesRepository(), emptyVault);
  return { sources, service: new ContentPlanService(sources) };
}

describe('splitSentences / shorten', () => {
  it('splits on sentence boundaries and trims', () => {
    expect(splitSentences('One. Two!  Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });
  it('shortens on a word boundary with an ellipsis', () => {
    expect(shorten('the quick brown fox jumps', 12)).toBe('the quick…');
    expect(shorten('short', 12)).toBe('short');
  });
});

describe('ContentPlanService', () => {
  it('builds a plan: hook from title, points from sentences, default CTA', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Street trees and urban heat',
      abstract: 'Tree cover cooled streets. Low-income areas had less of it. The gap widened in summer.',
    });
    const plan = await service.fromSource(src.id);
    expect(plan.hook).toBe('Street trees and urban heat');
    expect(plan.points.map((p) => p.claim)).toEqual([
      'Tree cover cooled streets.',
      'Low-income areas had less of it.',
      'The gap widened in summer.',
    ]);
    expect(plan.cta).toBe('Read more.');
  });

  it('never fabricates points and honours maxPoints', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X', abstract: 'Only one sentence.' });
    expect((await service.fromSource(src.id, { maxPoints: 3 })).points).toHaveLength(1);
  });
});
