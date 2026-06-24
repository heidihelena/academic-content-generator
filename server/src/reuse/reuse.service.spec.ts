import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService, CreateContentItemInput } from '../content/content.service';
import { ReuseService } from './reuse.service';

function setup() {
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
  return { content, reuse: new ReuseService(content) };
}

const item = (over: Partial<CreateContentItemInput> = {}): CreateContentItemInput => ({
  title: 'Trees',
  sourceIds: ['src_1'],
  audience: 'peers',
  pillar: 'research-finding',
  evidenceLevel: 'observational',
  claimRisk: 'low',
  ...over,
});

describe('ReuseService', () => {
  it('summarises prior variants for a source, counted by channel', async () => {
    const { content, reuse } = setup();
    const it1 = await content.createItem(item({ sourceIds: ['src_1'] }));
    await content.addVariant(it1.id, { channel: 'talk', format: 'talk-script', body: '# Trees cool streets' });
    await content.addVariant(it1.id, { channel: 'shorts', format: 'short-script', body: '[Short 1/2]\nHOOK: Canopy cools' });
    const it2 = await content.createItem(item({ sourceIds: ['src_2'] }));
    await content.addVariant(it2.id, { channel: 'talk', format: 'talk-script', body: 'other' });

    const summary = await reuse.summary('src_1');
    expect(summary.total).toBe(2);
    expect(summary.byChannel).toEqual({ talk: 1, shorts: 1 });
    expect(summary.items.map((i) => i.hook)).toContain('Trees cool streets');
  });

  it('builds composer context that strips markdown/markers', async () => {
    const { content, reuse } = setup();
    const it = await content.createItem(item({ sourceIds: ['src_1'], audience: 'peers' }));
    await content.addVariant(it.id, {
      channel: 'shorts',
      format: 'short-script',
      body: '[Short 1/2]\nHOOK: Canopy cools streets',
    });
    expect(await reuse.priorContext('src_1')).toEqual(['shorts/peers: Canopy cools streets']);
  });

  it('returns an empty summary for a source with no content', async () => {
    const { reuse } = setup();
    expect((await reuse.summary('src_none')).total).toBe(0);
  });
});
