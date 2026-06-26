import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService } from '../content/content.service';
import { InMemoryPublishLogRepository } from './publish-log.repository';
import { PublishLogService } from './publish-log.service';

async function setup() {
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
  const service = new PublishLogService(new InMemoryPublishLogRepository(), content);
  const item = await content.createItem({
    title: 'Trees and heat',
    audience: 'peers',
    pillar: 'research-finding',
    evidenceLevel: 'observational',
    claimRisk: 'low',
  });
  const variant = await content.addVariant(item.id, {
    channel: 'linkedin',
    format: 'post',
    body: 'Body',
  });
  return { service, variantId: variant.id };
}

describe('PublishLogService', () => {
  it('records a manual publish with the variant channel and trims fields', async () => {
    const { service, variantId } = await setup();
    const log = await service.record(variantId, {
      publishedUrl: '  https://linkedin.com/p/1  ',
      notes: '  cross-posted  ',
    });
    expect(log.id).toMatch(/^pl_/);
    expect(log.variantId).toBe(variantId);
    expect(log.channel).toBe('linkedin');
    expect(log.publishedUrl).toBe('https://linkedin.com/p/1');
    expect(log.notes).toBe('cross-posted');
    expect(log.publishedAt).toBeTruthy();
  });

  it('allows a publish with no URL (not every channel yields one)', async () => {
    const { service, variantId } = await setup();
    const log = await service.record(variantId, {});
    expect(log.publishedUrl).toBeUndefined();
    expect(log.notes).toBeUndefined();
  });

  it('lists logs for a variant, newest first', async () => {
    const { service, variantId } = await setup();
    await service.record(variantId, { notes: 'first' }, new Date('2026-01-01T00:00:00Z'));
    await service.record(variantId, { notes: 'second' }, new Date('2026-02-01T00:00:00Z'));
    const logs = await service.listForVariant(variantId);
    expect(logs.map((l) => l.notes)).toEqual(['second', 'first']);
  });

  it('404s when the variant does not exist', async () => {
    const { service } = await setup();
    await expect(service.record('cv_missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an invalid publishedAt', async () => {
    const { service, variantId } = await setup();
    await expect(service.record(variantId, { publishedAt: 'soon' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
