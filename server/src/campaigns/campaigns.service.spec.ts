import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentStatus } from '../domain/academic';
import { InMemoryCampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';

function makeService(): CampaignsService {
  return new CampaignsService(new InMemoryCampaignsRepository());
}

const fixed = new Date('2026-01-01T00:00:00.000Z');

describe('CampaignsService', () => {
  it('creates a campaign with a generated id and timestamps', async () => {
    const svc = makeService();
    const c = await svc.create(
      { title: '  Launch paper  ', goal: 'reach', audience: 'peers' },
      fixed,
    );
    expect(c.id).toMatch(/^cmp_/);
    expect(c.title).toBe('Launch paper');
    expect(c.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(c.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rejects a blank title, invalid audience, or inverted date range', async () => {
    const svc = makeService();
    await expect(svc.create({ title: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create({ title: 'X', audience: 'nope' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.create({ title: 'X', startDate: '2026-02-01', endDate: '2026-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('gets and lists campaigns, and 404s on a missing id', async () => {
    const svc = makeService();
    const a = await svc.create({ title: 'A' });
    expect(await svc.get(a.id)).toEqual(a);
    expect((await svc.list()).map((c) => c.id)).toContain(a.id);
    await expect(svc.get('cmp_missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates fields and bumps updatedAt, keeping createdAt', async () => {
    const svc = makeService();
    const c = await svc.create({ title: 'Old' }, fixed);
    const later = new Date('2026-02-02T00:00:00.000Z');
    const updated = await svc.update(c.id, { title: 'New', goal: 'awareness' }, later);
    expect(updated.title).toBe('New');
    expect(updated.goal).toBe('awareness');
    expect(updated.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('rejects a blank title on update', async () => {
    const svc = makeService();
    const c = await svc.create({ title: 'Keep' });
    await expect(svc.update(c.id, { title: '  ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes a campaign (and 404s afterwards)', async () => {
    const svc = makeService();
    const c = await svc.create({ title: 'Temp' });
    await svc.remove(c.id);
    await expect(svc.get(c.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.remove('cmp_missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rolls up content items by status with every status zero-filled', () => {
    const svc = makeService();
    const item = (status: ContentStatus) => ({ status });
    const rollup = svc.rollup([item('draft'), item('draft'), item('reviewed')]);
    expect(rollup.total).toBe(3);
    expect(rollup.byStatus.draft).toBe(2);
    expect(rollup.byStatus.reviewed).toBe(1);
    expect(rollup.byStatus.idea).toBe(0);
    expect(rollup.byStatus.exported).toBe(0);
    expect(svc.rollup([]).total).toBe(0);
  });
});
