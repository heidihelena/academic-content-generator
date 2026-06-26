import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService, CreateContentItemInput } from '../content/content.service';
import { InMemoryAssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';

const itemInput: CreateContentItemInput = {
  title: 'Trees and heat',
  audience: 'peers',
  pillar: 'research-finding',
  evidenceLevel: 'observational',
  claimRisk: 'low',
};

function setup() {
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
  return { content, assets: new AssetsService(new InMemoryAssetsRepository(), content) };
}

describe('AssetsService', () => {
  it('attaches assets and lists them oldest first', async () => {
    const { content, assets } = setup();
    const item = await content.createItem(itemInput, undefined, 'alice');
    await assets.attach(item.id, { url: 'https://x/a.png', type: 'image', label: 'Cover' }, 'alice', new Date('2026-01-01T00:00:00Z'));
    await assets.attach(item.id, { url: 'https://x/b.mp4', type: 'video' }, 'alice', new Date('2026-01-02T00:00:00Z'));

    const list = await assets.listForItem(item.id, 'alice');
    expect(list.map((a) => a.type)).toEqual(['image', 'video']);
    expect(list[0]).toMatchObject({ url: 'https://x/a.png', label: 'Cover' });
    expect(list[0].id).toMatch(/^as_/);
  });

  it('rejects a missing url or an invalid type', async () => {
    const { content, assets } = setup();
    const item = await content.createItem(itemInput, undefined, 'alice');
    await expect(assets.attach(item.id, { url: '', type: 'image' }, 'alice')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      assets.attach(item.id, { url: 'https://x/a.png', type: 'gif' as never }, 'alice'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes an asset (and 404s across items)', async () => {
    const { content, assets } = setup();
    const a = await content.createItem(itemInput, undefined, 'alice');
    const b = await content.createItem(itemInput, undefined, 'alice');
    const onA = await assets.attach(a.id, { url: 'https://x/a.png', type: 'image' }, 'alice');
    await expect(assets.remove(b.id, onA.id, 'alice')).rejects.toBeInstanceOf(NotFoundException);
    await assets.remove(a.id, onA.id, 'alice');
    expect(await assets.listForItem(a.id, 'alice')).toHaveLength(0);
  });

  it('scopes to the item owner', async () => {
    const { content, assets } = setup();
    const bobItem = await content.createItem(itemInput, undefined, 'bob');
    await expect(assets.listForItem(bobItem.id, 'alice')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      assets.attach(bobItem.id, { url: 'https://x/a.png', type: 'image' }, 'alice'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
