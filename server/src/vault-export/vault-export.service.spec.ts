import { mkdtemp, readFile, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService, CreateContentItemInput } from '../content/content.service';
import { InMemorySourcesRepository } from '../sources/sources.repository';
import { SourcesService } from '../sources/sources.service';
import { VaultExportService } from './vault-export.service';

const emptyVault = { listNotes: async () => [], getNote: async () => null } as never;

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'forskai-vault-'));
  const config = { get: () => dir } as never;
  const sources = new SourcesService(new InMemorySourcesRepository(), emptyVault);
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
  const exporter = new VaultExportService(config, sources, content);
  return { dir, sources, content, exporter };
}

const item = (over: Partial<CreateContentItemInput> = {}): CreateContentItemInput => ({
  title: 'Street trees cool least where it is hottest',
  sourceIds: [],
  audience: 'public',
  pillar: 'research-finding',
  evidenceLevel: 'observational',
  claimRisk: 'low',
  ...over,
});

describe('VaultExportService', () => {
  it('exports a ContentItem as a hub note backlinking up to sources and down to variants', async () => {
    const { dir, sources, content, exporter } = await setup();
    const src = await sources.create({ kind: 'paper', title: 'Trees and Heat' });
    const it = await content.createItem(item({ sourceIds: [src.id], campaignId: 'cmp_x' }));
    await content.addVariant(it.id, { channel: 'linkedin', format: 'post', body: 'LI copy' });
    await content.addVariant(it.id, { channel: 'bluesky', format: 'thread', body: '1/ …' });

    const { paths, hub } = await exporter.exportContentItem(it.id);
    expect(paths).toHaveLength(3); // 2 variants + the item hub
    expect(hub.startsWith(join('ForskAI', 'cmp_x'))).toBe(true);

    const hubText = await readFile(join(dir, hub), 'utf8');
    expect(hubText).toContain('forskai: content-item');
    expect(hubText).toContain('[[Trees and Heat]]'); // backlink up to the source
    expect((hubText.match(/- \[\[/g) ?? []).length).toBeGreaterThanOrEqual(3); // 1 source + 2 variants

    const variantPath = paths.find((p) => /linkedin-post/.test(p))!;
    const variantText = await readFile(join(dir, variantPath), 'utf8');
    expect(variantText).toContain('forskai: content-variant');
    expect(variantText).toMatch(/Part of:: \[\[.*\]\]/); // backlink to the item
  });

  it('exports a whole campaign — every item + an index linking the hubs', async () => {
    const { dir, content, exporter } = await setup();
    const a = await content.createItem(item({ campaignId: 'cmp_9', title: 'Idea A' }));
    await content.addVariant(a.id, { channel: 'linkedin', format: 'post', body: 'a' });
    const b = await content.createItem(item({ campaignId: 'cmp_9', title: 'Idea B' }));
    await content.addVariant(b.id, { channel: 'bluesky', format: 'thread', body: 'b' });

    const { paths } = await exporter.exportCampaign('cmp_9');
    // 2 items × (1 variant + 1 hub) + 1 index = 5
    expect(paths).toHaveLength(5);

    const files = await readdir(join(dir, 'ForskAI', 'cmp_9'));
    expect(files).toContain('_index.md');
    const index = await readFile(join(dir, 'ForskAI', 'cmp_9', '_index.md'), 'utf8');
    expect(index).toContain('2 idea(s)');
    expect((index.match(/- \[\[/g) ?? [])).toHaveLength(2);
  });
});
