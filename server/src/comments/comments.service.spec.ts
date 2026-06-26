import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService, CreateContentItemInput } from '../content/content.service';
import { InMemoryCommentsRepository } from './comments.repository';
import { CommentsService } from './comments.service';

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
  return { content, comments: new CommentsService(new InMemoryCommentsRepository(), content) };
}

describe('CommentsService', () => {
  it('adds and lists comments oldest first, stamping the author', async () => {
    const { content, comments } = setup();
    const item = await content.createItem(itemInput, undefined, 'alice');
    await comments.add(item.id, 'First note', 'alice', new Date('2026-01-01T00:00:00Z'));
    await comments.add(item.id, 'Second note', 'alice', new Date('2026-01-02T00:00:00Z'));

    const list = await comments.listForItem(item.id, 'alice');
    expect(list.map((c) => c.body)).toEqual(['First note', 'Second note']);
    expect(list[0]).toMatchObject({ author: 'alice', itemId: item.id });
    expect(list[0].id).toMatch(/^cm_/);
  });

  it('rejects an empty comment', async () => {
    const { content, comments } = setup();
    const item = await content.createItem(itemInput, undefined, 'alice');
    await expect(comments.add(item.id, '   ', 'alice')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s on a missing item', async () => {
    const { comments } = setup();
    await expect(comments.listForItem('ci_missing', 'alice')).rejects.toBeInstanceOf(NotFoundException);
    await expect(comments.add('ci_missing', 'hi', 'alice')).rejects.toBeInstanceOf(NotFoundException);
  });

  it("scopes to the item owner — another user can't read or comment", async () => {
    const { content, comments } = setup();
    const bobItem = await content.createItem(itemInput, undefined, 'bob');
    await expect(comments.listForItem(bobItem.id, 'alice')).rejects.toBeInstanceOf(NotFoundException);
    await expect(comments.add(bobItem.id, 'sneaky', 'alice')).rejects.toBeInstanceOf(NotFoundException);
    // Bob can.
    await comments.add(bobItem.id, 'mine', 'bob');
    expect(await comments.listForItem(bobItem.id, 'bob')).toHaveLength(1);
  });
});
