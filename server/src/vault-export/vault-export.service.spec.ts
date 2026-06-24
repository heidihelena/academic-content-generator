import { mkdtemp, readFile, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ContentOutput } from '../domain/academic';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService } from '../content/content.service';
import { InMemoryOutputsRepository } from '../outputs/outputs.repository';
import { OutputsService } from '../outputs/outputs.service';
import { InMemorySourcesRepository } from '../sources/sources.repository';
import { SourcesService } from '../sources/sources.service';
import { VaultExportService } from './vault-export.service';

const emptyVault = { listNotes: async () => [], getNote: async () => null } as never;

function output(over: Partial<ContentOutput> = {}): ContentOutput {
  const iso = '2026-06-24T00:00:00.000Z';
  return {
    id: `out_${Math.random().toString(36).slice(2, 8)}`,
    sourceId: 'src_1',
    campaignId: 'cmp_1',
    channel: 'talk',
    audience: 'peers',
    body: 'Body.',
    status: 'draft',
    createdAt: iso,
    updatedAt: iso,
    ...over,
  };
}

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'forskai-vault-'));
  const config = { get: () => dir } as never;
  const outputs = new OutputsService(new InMemoryOutputsRepository());
  const sources = new SourcesService(new InMemorySourcesRepository(), emptyVault);
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
  const exporter = new VaultExportService(config, outputs, sources, content);
  return { dir, outputs, sources, content, exporter };
}

describe('VaultExportService', () => {
  it('exports a single output as a markdown note under ForskAI/<campaign>/', async () => {
    const { dir, outputs, sources, exporter } = await setup();
    const src = await sources.create({ kind: 'paper', title: 'Trees and Heat' });
    const saved = await outputs.save(output({ sourceId: src.id, campaignId: 'cmp_1' }));

    const { path } = await exporter.exportOutput(saved.id);
    expect(path.startsWith(join('ForskAI', 'cmp_1'))).toBe(true);

    const contents = await readFile(join(dir, path), 'utf8');
    expect(contents).toContain('id: ' + saved.id);
    expect(contents).toContain('Source:: [[Trees and Heat]]');
  });

  it('exports a whole campaign plus an index note that links each output', async () => {
    const { dir, outputs, exporter } = await setup();
    await outputs.saveMany([
      output({ campaignId: 'cmp_9', channel: 'talk' }),
      output({ campaignId: 'cmp_9', channel: 'shorts' }),
    ]);

    const { paths } = await exporter.exportCampaign('cmp_9');
    expect(paths).toHaveLength(3); // 2 notes + index

    const files = await readdir(join(dir, 'ForskAI', 'cmp_9'));
    expect(files).toContain('_index.md');
    const index = await readFile(join(dir, 'ForskAI', 'cmp_9', '_index.md'), 'utf8');
    expect(index).toContain('2 output(s)');
    expect((index.match(/- \[\[/g) ?? [])).toHaveLength(2);
  });

  it('exports a ContentItem as a hub note backlinking up to sources and down to variants', async () => {
    const { dir, sources, content, exporter } = await setup();
    const src = await sources.create({ kind: 'paper', title: 'Trees and Heat' });
    const item = await content.createItem({
      title: 'Street trees cool least where it is hottest',
      sourceIds: [src.id],
      campaignId: 'cmp_x',
      audience: 'public',
      pillar: 'research-finding',
      evidenceLevel: 'observational',
      claimRisk: 'low',
    });
    await content.addVariant(item.id, { channel: 'linkedin', format: 'post', body: 'LI copy' });
    await content.addVariant(item.id, { channel: 'bluesky', format: 'thread', body: '1/ …' });

    const { paths } = await exporter.exportContentItem(item.id);
    expect(paths).toHaveLength(3); // 2 variants + the item hub

    const hubPath = paths[paths.length - 1]; // hub note is written last
    expect(hubPath.startsWith(join('ForskAI', 'cmp_x'))).toBe(true);
    const hub = await readFile(join(dir, hubPath), 'utf8');
    expect(hub).toContain('forskai: content-item');
    expect(hub).toContain('## Sources');
    expect(hub).toContain('[[Trees and Heat]]'); // backlink up to the source
    expect(hub).toContain('## Variants');
    expect((hub.match(/- \[\[/g) ?? []).length).toBeGreaterThanOrEqual(3); // 1 source + 2 variants

    const variantPath = paths.find((p) => /linkedin-post/.test(p))!;
    const variant = await readFile(join(dir, variantPath), 'utf8');
    expect(variant).toContain('forskai: content-variant');
    expect(variant).toMatch(/Part of:: \[\[.*\]\]/); // backlink down→up to the item
  });
});
