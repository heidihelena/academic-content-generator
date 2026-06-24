import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentOutput } from '../domain/academic';
import { InMemoryOutputsRepository } from './outputs.repository';
import { OutputsService } from './outputs.service';

function output(over: Partial<ContentOutput> = {}): ContentOutput {
  const iso = '2026-06-24T00:00:00.000Z';
  return {
    id: `out_${Math.random().toString(36).slice(2)}`,
    sourceId: 'src_1',
    campaignId: 'cmp_1',
    channel: 'talk',
    audience: 'peers',
    body: 'body',
    status: 'draft',
    createdAt: iso,
    updatedAt: iso,
    ...over,
  };
}

function setup() {
  return new OutputsService(new InMemoryOutputsRepository());
}

describe('OutputsService', () => {
  it('saves a batch and lists by campaign and by source', async () => {
    const service = setup();
    await service.saveMany([
      output({ campaignId: 'cmp_1', sourceId: 'src_1' }),
      output({ campaignId: 'cmp_1', sourceId: 'src_1', channel: 'shorts' }),
      output({ campaignId: 'cmp_2', sourceId: 'src_2' }),
    ]);

    expect(await service.list({ campaignId: 'cmp_1' })).toHaveLength(2);
    expect(await service.list({ sourceId: 'src_2' })).toHaveLength(1);
    expect(await service.list()).toHaveLength(3);
  });

  it('updates status and stamps updatedAt', async () => {
    const service = setup();
    const saved = await service.save(output({ status: 'draft' }));
    const updated = await service.updateStatus(saved.id, 'reviewed', new Date('2026-07-01'));
    expect(updated.status).toBe('reviewed');
    expect(updated.updatedAt).toBe(new Date('2026-07-01').toISOString());
  });

  it('schedules a piece with a date, rejecting an invalid one', async () => {
    const service = setup();
    const saved = await service.save(output());
    const scheduled = await service.schedule(saved.id, '2026-02-01T09:00:00.000Z', new Date('2026-01-10'));
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.scheduledFor).toBe('2026-02-01T09:00:00.000Z');
    await expect(service.schedule(saved.id, 'not-a-date')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('gates export on a cleared safety review', async () => {
    const service = setup();
    const review = (cleared: boolean) => ({ claims: [], findings: [], reviewedAt: 'x', cleared });

    const blocked = await service.save(output({ reviewState: review(false) }));
    await expect(service.export(blocked.id)).rejects.toBeInstanceOf(BadRequestException);
    // Same block applies through the generic status update.
    await expect(service.updateStatus(blocked.id, 'exported')).rejects.toBeInstanceOf(BadRequestException);

    const cleared = await service.save(output({ reviewState: review(true) }));
    expect((await service.export(cleared.id)).status).toBe('exported');

    // An output that was never reviewed cannot be exported either.
    const unreviewed = await service.save(output({ reviewState: undefined }));
    await expect(service.export(unreviewed.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid status and 404s for a missing id', async () => {
    const service = setup();
    const saved = await service.save(output());
    await expect(service.updateStatus(saved.id, 'bogus' as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.get('out_missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('out_missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
