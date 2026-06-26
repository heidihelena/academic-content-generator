import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService, CreateContentItemInput } from '../content/content.service';
import { InMemoryChecklistRepository } from './checklist.repository';
import { ChecklistService } from './checklist.service';

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
  return { content, checklist: new ChecklistService(new InMemoryChecklistRepository(), content) };
}

describe('ChecklistService', () => {
  it('adds entries (default not done) and lists them oldest first', async () => {
    const { content, checklist } = setup();
    const item = await content.createItem(itemInput, undefined, 'alice');
    await checklist.add(item.id, 'Add alt text', 'alice', new Date('2026-01-01T00:00:00Z'));
    await checklist.add(item.id, 'Tag co-authors', 'alice', new Date('2026-01-02T00:00:00Z'));

    const list = await checklist.listForItem(item.id, 'alice');
    expect(list.map((c) => c.label)).toEqual(['Add alt text', 'Tag co-authors']);
    expect(list.every((c) => c.done === false)).toBe(true);
    expect(list[0].id).toMatch(/^ck_/);
  });

  it('toggles the done flag', async () => {
    const { content, checklist } = setup();
    const item = await content.createItem(itemInput, undefined, 'alice');
    const entry = await checklist.add(item.id, 'Fact-check', 'alice');
    const done = await checklist.setDone(item.id, entry.id, true, 'alice');
    expect(done.done).toBe(true);
  });

  it('removes an entry', async () => {
    const { content, checklist } = setup();
    const item = await content.createItem(itemInput, undefined, 'alice');
    const entry = await checklist.add(item.id, 'Temp', 'alice');
    await checklist.remove(item.id, entry.id, 'alice');
    expect(await checklist.listForItem(item.id, 'alice')).toHaveLength(0);
  });

  it('rejects an empty label', async () => {
    const { content, checklist } = setup();
    const item = await content.createItem(itemInput, undefined, 'alice');
    await expect(checklist.add(item.id, '  ', 'alice')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s on a missing item or a check that belongs to another item', async () => {
    const { content, checklist } = setup();
    const a = await content.createItem(itemInput, undefined, 'alice');
    const b = await content.createItem(itemInput, undefined, 'alice');
    const onA = await checklist.add(a.id, 'A', 'alice');

    await expect(checklist.listForItem('ci_missing', 'alice')).rejects.toBeInstanceOf(NotFoundException);
    // Right item id required for the check id.
    await expect(checklist.setDone(b.id, onA.id, true, 'alice')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes to the item owner', async () => {
    const { content, checklist } = setup();
    const bobItem = await content.createItem(itemInput, undefined, 'bob');
    await expect(checklist.listForItem(bobItem.id, 'alice')).rejects.toBeInstanceOf(NotFoundException);
    await expect(checklist.add(bobItem.id, 'sneaky', 'alice')).rejects.toBeInstanceOf(NotFoundException);
  });
});
