import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from './content.repository';
import { ContentService, CreateContentItemInput } from './content.service';

function setup() {
  return new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
}

const item = (over: Partial<CreateContentItemInput> = {}): CreateContentItemInput => ({
  title: 'Trees and heat',
  audience: 'public',
  pillar: 'research-finding',
  evidenceLevel: 'observational',
  claimRisk: 'low',
  ...over,
});

describe('ContentService.scheduledFeed', () => {
  it('returns only scheduled variants, joined to their item, sorted by time', async () => {
    const service = setup();
    const it = await service.createItem(item({ title: 'Trees and heat', audience: 'public' }));
    const later = await service.addVariant(it.id, { channel: 'linkedin', format: 'post', body: 'a' });
    const earlier = await service.addVariant(it.id, { channel: 'bluesky', format: 'thread', body: 'b' });
    await service.addVariant(it.id, { channel: 'teaching', format: 'slide', body: 'c' }); // unscheduled

    await service.scheduleVariant(later.id, '2030-03-02T09:00:00.000Z');
    await service.scheduleVariant(earlier.id, '2030-03-01T09:00:00.000Z');

    const feed = await service.scheduledFeed();
    expect(feed).toHaveLength(2); // the unscheduled one is excluded
    expect(feed.map((e) => e.channel)).toEqual(['bluesky', 'linkedin']); // sorted by scheduledAt
    expect(feed[0]).toMatchObject({ title: 'Trees and heat', audience: 'public', status: 'scheduled' });
  });

  it('is empty when nothing is scheduled', async () => {
    const service = setup();
    const it = await service.createItem(item());
    await service.addVariant(it.id, { channel: 'linkedin', format: 'post', body: 'a' });
    expect(await service.scheduledFeed()).toEqual([]);
  });
});
