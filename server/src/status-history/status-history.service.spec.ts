import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService } from '../content/content.service';
import { InMemoryStatusHistoryRepository } from './status-history.repository';
import { StatusHistoryService } from './status-history.service';

function service() {
  return new StatusHistoryService(new InMemoryStatusHistoryRepository());
}

describe('StatusHistoryService', () => {
  it('records a transition and lists it', async () => {
    const s = service();
    await s.record('cv_1', 'draft', 'reviewed', 'alice');
    const log = await s.listForVariant('cv_1');
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ from: 'draft', to: 'reviewed', actor: 'alice' });
  });

  it('ignores no-op transitions (from === to)', async () => {
    const s = service();
    await s.record('cv_1', 'draft', 'draft');
    expect(await s.listForVariant('cv_1')).toHaveLength(0);
  });

  it('orders transitions oldest first', async () => {
    const s = service();
    await s.record('cv_1', undefined, 'draft', undefined, new Date('2026-01-01T00:00:00Z'));
    await s.record('cv_1', 'draft', 'reviewed', undefined, new Date('2026-01-02T00:00:00Z'));
    expect((await s.listForVariant('cv_1')).map((c) => c.to)).toEqual(['draft', 'reviewed']);
  });
});

describe('ContentService → StatusHistory integration', () => {
  function setup() {
    const history = service();
    const content = new ContentService(
      new InMemoryContentItemsRepository(),
      new InMemoryContentVariantsRepository(),
      undefined,
      history,
    );
    return { content, history };
  }
  const cleared = { claims: [], findings: [], reviewedAt: 'x', cleared: true };

  it('records the full lifecycle of a variant', async () => {
    const { content, history } = setup();
    const item = await content.createItem({
      title: 'T',
      audience: 'peers',
      pillar: 'research-finding',
      evidenceLevel: 'observational',
      claimRisk: 'low',
    });
    const v = await content.addVariant(item.id, { channel: 'linkedin', format: 'post', body: 'x' }, undefined, 'alice');
    await content.updateVariant(v.id, { safetyReview: cleared });
    await content.markReviewed(v.id);
    await content.updateVariant(v.id, { status: 'reviewed' });
    await content.scheduleVariant(v.id, '2026-06-18T09:00:00.000Z');
    await content.exportVariant(v.id);

    const log = await history.listForVariant(v.id);
    expect(log.map((c) => c.to)).toEqual(['draft', 'reviewed', 'scheduled', 'exported']);
    expect(log[0]).toMatchObject({ from: undefined, actor: 'alice' }); // creation, by alice
  });
});
