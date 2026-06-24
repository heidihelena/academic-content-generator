import { ContentOutput } from '../domain/academic';
import { InMemoryOutputsRepository } from '../outputs/outputs.repository';
import { OutputsService } from '../outputs/outputs.service';
import { ReuseService } from './reuse.service';

function output(over: Partial<ContentOutput> = {}): ContentOutput {
  const iso = '2026-06-24T00:00:00.000Z';
  return {
    id: `out_${Math.random().toString(36).slice(2, 8)}`,
    sourceId: 'src_1',
    campaignId: 'cmp_1',
    channel: 'talk',
    audience: 'peers',
    body: '# Trees cool streets\n\nbody',
    status: 'draft',
    createdAt: iso,
    updatedAt: iso,
    ...over,
  };
}

function setup() {
  const outputs = new OutputsService(new InMemoryOutputsRepository());
  return { outputs, reuse: new ReuseService(outputs) };
}

describe('ReuseService', () => {
  it('summarises prior outputs for a source, counted by channel', async () => {
    const { outputs, reuse } = setup();
    await outputs.saveMany([
      output({ sourceId: 'src_1', channel: 'talk' }),
      output({ sourceId: 'src_1', channel: 'shorts', body: '[Short 1/2]\nHOOK: Canopy cools' }),
      output({ sourceId: 'src_2', channel: 'talk' }),
    ]);

    const summary = await reuse.summary('src_1');
    expect(summary.total).toBe(2);
    expect(summary.byChannel).toEqual({ talk: 1, shorts: 1 });
    expect(summary.items.map((i) => i.hook)).toContain('Trees cool streets');
  });

  it('builds composer context that strips markdown/markers', async () => {
    const { outputs, reuse } = setup();
    await outputs.save(output({ sourceId: 'src_1', channel: 'shorts', body: '[Short 1/2]\nHOOK: Canopy cools streets' }));
    const ctx = await reuse.priorContext('src_1');
    expect(ctx).toEqual(['shorts/peers: Canopy cools streets']);
  });

  it('returns an empty summary for a source with no outputs', async () => {
    const { reuse } = setup();
    expect((await reuse.summary('src_none')).total).toBe(0);
  });
});
