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

  it('scopes the feed to the owner — never leaks another user\'s scheduled content', async () => {
    const service = setup();
    // Two users each schedule one variant.
    const aliceItem = await service.createItem(item({ title: 'Alice paper' }), new Date(), 'alice');
    const aliceVar = await service.addVariant(aliceItem.id, { channel: 'linkedin', format: 'post', body: 'a' });
    await service.scheduleVariant(aliceVar.id, '2030-03-01T09:00:00.000Z');

    const bobItem = await service.createItem(item({ title: 'Bob paper' }), new Date(), 'bob');
    const bobVar = await service.addVariant(bobItem.id, { channel: 'bluesky', format: 'thread', body: 'b' });
    await service.scheduleVariant(bobVar.id, '2030-03-02T09:00:00.000Z');

    // Each user sees only their own; an unscoped call (local-first default) sees both.
    expect((await service.scheduledFeed('alice')).map((e) => e.title)).toEqual(['Alice paper']);
    expect((await service.scheduledFeed('bob')).map((e) => e.title)).toEqual(['Bob paper']);
    expect((await service.scheduledFeed()).map((e) => e.title)).toEqual(['Alice paper', 'Bob paper']);
  });
});
