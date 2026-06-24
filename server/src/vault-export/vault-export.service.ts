import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { ContentService } from '../content/content.service';
import { SourcesService } from '../sources/sources.service';
import {
  itemNoteBasename,
  renderItemNote,
  renderVariantNote,
  variantNoteBasename,
} from './content-note';

const EXPORT_ROOT = 'ForskAI';

/**
 * Exports content to the Obsidian vault as a linked map-of-content — a one-way
 * projection of the ContentItem/Variant store (which remains the system of
 * record). A ContentItem becomes a hub note backlinking up to its sources and
 * down to each variant; a campaign export writes every item in the series plus
 * an index, so generated content lives where the research lives.
 */
@Injectable()
export class VaultExportService {
  private readonly logger = new Logger(VaultExportService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly sources: SourcesService,
    private readonly content: ContentService,
  ) {}

  private get vaultPath(): string {
    return this.config.get<string>('vault.path') ?? './vault';
  }

  /**
   * Export a ContentItem as a hub note (backlinking up to sources and down to
   * variants) plus a child note per variant. Returns the relative paths;
   * `hub` is the hub note's path.
   */
  async exportContentItem(itemId: string): Promise<{ paths: string[]; hub: string }> {
    const item = await this.content.getItem(itemId); // 404 if missing
    const variants = await this.content.listVariants(itemId);
    const dir = join(EXPORT_ROOT, item.campaignId ?? '_unsorted');
    const itemBase = itemNoteBasename(item);

    const variantBasenames: string[] = [];
    const paths: string[] = [];
    for (const variant of variants) {
      const base = variantNoteBasename(variant);
      variantBasenames.push(base);
      const rel = join(dir, itemBase, `${base}.md`);
      await this.write(rel, renderVariantNote(variant, { itemBasename: itemBase }));
      paths.push(rel);
    }

    const sourceTitles: Record<string, string> = {};
    for (const id of item.sourceIds) {
      const title = await this.sourceTitle(id);
      if (title) sourceTitles[id] = title;
    }

    const hub = join(dir, `${itemBase}.md`);
    await this.write(hub, renderItemNote(item, { sourceTitles, variantBasenames }));
    paths.push(hub);
    return { paths, hub };
  }

  /**
   * Export a whole campaign: every ContentItem in it (hub + variants) plus an
   * index note linking the item hubs. Returns the paths written.
   */
  async exportCampaign(campaignId: string): Promise<{ paths: string[] }> {
    const items = await this.content.listItems({ campaignId });
    const paths: string[] = [];
    const hubs: string[] = [];
    for (const item of items) {
      const { paths: itemPaths, hub } = await this.exportContentItem(item.id);
      paths.push(...itemPaths);
      hubs.push(hub);
    }
    if (hubs.length) paths.push(await this.writeIndex(campaignId, hubs));
    return { paths };
  }

  private async writeIndex(campaignId: string, hubPaths: string[]): Promise<string> {
    const links = hubPaths
      .map((rel) => `- [[${(rel.split(/[/\\]/).pop() ?? '').replace(/\.md$/, '')}]]`)
      .join('\n');
    const body =
      `---\nforskai: campaign-index\ncampaign: ${campaignId}\n---\n\n` +
      `# Campaign ${campaignId}\n\n${hubPaths.length} idea(s).\n\n${links}\n`;
    const rel = join(EXPORT_ROOT, campaignId, '_index.md');
    await this.write(rel, body);
    return rel;
  }

  private async write(rel: string, contents: string): Promise<void> {
    const full = join(this.vaultPath, rel);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, contents, 'utf8');
    this.logger.log(`exported ${rel}`);
  }

  private async sourceTitle(sourceId: string): Promise<string | undefined> {
    try {
      return (await this.sources.get(sourceId)).title;
    } catch {
      return undefined; // source gone — fall back to the id backlink
    }
  }
}
