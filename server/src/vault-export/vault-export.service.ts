import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { ContentOutput } from '../domain/academic';
import { ContentService } from '../content/content.service';
import { OutputsService } from '../outputs/outputs.service';
import { SourcesService } from '../sources/sources.service';
import {
  itemNoteBasename,
  renderItemNote,
  renderVariantNote,
  variantNoteBasename,
} from './content-note';
import { renderOutputNote, slugify } from './output-note';

const EXPORT_ROOT = 'ForskAI';

/**
 * Exports stored outputs to the Obsidian vault as markdown notes — a one-way
 * projection of the outputs store (which remains the system of record). Notes
 * are grouped by campaign and backlink to their source note, so a generated
 * series lives where the research lives and feeds future campaigns through
 * Obsidian's own links.
 */
@Injectable()
export class VaultExportService {
  private readonly logger = new Logger(VaultExportService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly outputs: OutputsService,
    private readonly sources: SourcesService,
    private readonly content: ContentService,
  ) {}

  private get vaultPath(): string {
    return this.config.get<string>('vault.path') ?? './vault';
  }

  /**
   * Export a ContentItem as a linked map-of-content: a hub note backlinking up
   * to its sources and down to each variant, plus a child note per variant.
   * Returns the paths written (relative to the vault).
   */
  async exportContentItem(itemId: string): Promise<{ paths: string[] }> {
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

    const itemRel = join(dir, `${itemBase}.md`);
    await this.write(itemRel, renderItemNote(item, { sourceTitles, variantBasenames }));
    paths.push(itemRel);
    return { paths };
  }

  /** Export a single output; returns the path written (relative to the vault). */
  async exportOutput(id: string): Promise<{ path: string }> {
    const output = await this.outputs.get(id); // 404 if missing
    return { path: await this.writeNote(output) };
  }

  /**
   * Export a whole campaign's outputs plus an index note linking them.
   * Returns the paths written (relative to the vault).
   */
  async exportCampaign(campaignId: string): Promise<{ paths: string[] }> {
    const outputs = await this.outputs.list({ campaignId });
    const notes: Array<{ output: ContentOutput; rel: string }> = [];
    for (const output of outputs) notes.push({ output, rel: await this.writeNote(output) });
    const paths = notes.map((n) => n.rel);
    if (notes.length) paths.push(await this.writeIndex(campaignId, notes));
    return { paths };
  }

  private async writeNote(output: ContentOutput): Promise<string> {
    const sourceTitle = await this.sourceTitle(output.sourceId);
    const dir = output.campaignId ? join(EXPORT_ROOT, output.campaignId) : join(EXPORT_ROOT, '_unsorted');
    const rel = join(dir, `${this.basename(output, sourceTitle)}.md`);
    await this.write(rel, renderOutputNote(output, { sourceTitle }));
    return rel;
  }

  private basename(output: ContentOutput, sourceTitle?: string): string {
    return `${output.channel}-${slugify(sourceTitle ?? output.id)}-${output.id.slice(-6)}`;
  }

  private async writeIndex(
    campaignId: string,
    notes: ReadonlyArray<{ output: ContentOutput; rel: string }>,
  ): Promise<string> {
    const links = notes
      .map(({ output, rel }) => {
        const base = (rel.split(/[/\\]/).pop() ?? '').replace(/\.md$/, '');
        return `- [[${base}]] — ${output.channel} · ${output.audience} (${output.status})`;
      })
      .join('\n');
    const body =
      `---\nforskai: campaign-index\ncampaign: ${campaignId}\n---\n\n` +
      `# Campaign ${campaignId}\n\n${notes.length} output(s).\n\n${links}\n`;
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
