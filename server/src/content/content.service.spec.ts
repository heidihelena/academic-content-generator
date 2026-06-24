import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewState } from '../domain/academic';
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

const itemInput: CreateContentItemInput = {
  title: 'Street trees and urban heat',
  sourceIds: ['src_1'],
  audience: 'peers',
  pillar: 'research-finding',
  evidenceLevel: 'observational',
  claimRisk: 'low',
};

const review = (cleared: boolean): ReviewState => ({ claims: [], findings: [], reviewedAt: 'x', cleared });

describe('ContentService — items', () => {
  it('creates an idea with strategy fields, defaulting status to idea', async () => {
    const service = setup();
    const item = await service.createItem(itemInput);
    expect(item.id).toMatch(/^ci_/);
    expect(item.status).toBe('idea');
    expect(item.pillar).toBe('research-finding');
    expect(item.sourceIds).toEqual(['src_1']);
  });

  it('validates the controlled vocabularies', async () => {
    const service = setup();
    await expect(service.createItem({ ...itemInput, pillar: 'nope' as never })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.createItem({ ...itemInput, evidenceLevel: 'guess' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createItem({ ...itemInput, title: '  ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cascade-deletes an item and its variants', async () => {
    const service = setup();
    const item = await service.createItem(itemInput);
    await service.addVariant(item.id, { channel: 'linkedin', format: 'post', body: 'a' });
    await service.addVariant(item.id, { channel: 'bluesky', format: 'thread', body: 'b' });
    await service.removeItem(item.id);
    expect(await service.listVariants(item.id)).toHaveLength(0);
    await expect(service.getItem(item.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ContentService — variants', () => {
  it('fans one idea out into many channel/format variants', async () => {
    const service = setup();
    const item = await service.createItem(itemInput);
    await service.addVariant(item.id, { channel: 'linkedin', format: 'post', body: 'LinkedIn copy' });
    await service.addVariant(item.id, { channel: 'bluesky', format: 'thread', body: '1/ …' });
    await service.addVariant(item.id, { channel: 'teaching', format: 'slide', body: 'Slide' });

    const variants = await service.listVariants(item.id);
    expect(variants).toHaveLength(3);
    expect(variants.map((v) => `${v.channel}/${v.format}`).sort()).toEqual([
      'bluesky/thread',
      'linkedin/post',
      'teaching/slide',
    ]);
  });

  it('404s adding a variant to a missing item and validates channel/format', async () => {
    const service = setup();
    await expect(
      service.addVariant('ci_missing', { channel: 'linkedin', format: 'post', body: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const item = await service.createItem(itemInput);
    await expect(
      service.addVariant(item.id, { channel: 'nope' as never, format: 'post', body: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('runs the variant lifecycle: schedule then publish, gated by the safety review', async () => {
    const service = setup();
    const item = await service.createItem(itemInput);
    const variant = await service.addVariant(item.id, {
      channel: 'linkedin',
      format: 'post',
      body: 'copy',
      safetyReview: review(true),
    });

    const scheduled = await service.scheduleVariant(variant.id, '2030-02-01T09:00:00.000Z');
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.scheduledAt).toBe('2030-02-01T09:00:00.000Z');

    const exported = await service.exportVariant(variant.id);
    expect(exported.status).toBe('exported');
    expect(exported.exportedAt).toBeTruthy();
  });

  it('blocks export of a variant whose safety review is not cleared (or absent)', async () => {
    const service = setup();
    const item = await service.createItem(itemInput);
    const blocked = await service.addVariant(item.id, {
      channel: 'linkedin',
      format: 'post',
      body: 'copy',
      safetyReview: review(false),
    });
    await expect(service.exportVariant(blocked.id)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateVariant(blocked.id, { status: 'exported' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const unreviewed = await service.addVariant(item.id, { channel: 'bluesky', format: 'thread', body: 'x' });
    await expect(service.exportVariant(unreviewed.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid schedule date', async () => {
    const service = setup();
    const item = await service.createItem(itemInput);
    const variant = await service.addVariant(item.id, { channel: 'linkedin', format: 'post', body: 'x' });
    await expect(service.scheduleVariant(variant.id, 'soon')).rejects.toBeInstanceOf(BadRequestException);
  });
});
