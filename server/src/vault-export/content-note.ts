import { ContentItem, ContentVariant, isCleared } from '../domain/academic';
import { slugify } from './output-note';

/**
 * Renders ContentItems and ContentVariants as a linked Obsidian map-of-content:
 * the item is a hub note that backlinks *up* to its sources and *down* to each
 * variant; each variant backlinks to its item. Obsidian's graph then shows the
 * real shape — source → idea → variant — navigable both ways. One-way export:
 * the store stays the system of record, so notes carry ids and overwrite safely.
 */

export function itemNoteBasename(item: Pick<ContentItem, 'id' | 'title'>): string {
  return `${slugify(item.title)}-${item.id.slice(-6)}`;
}

export function variantNoteBasename(variant: Pick<ContentVariant, 'id' | 'channel' | 'format'>): string {
  return `${variant.channel}-${variant.format}-${variant.id.slice(-6)}`;
}

function frontmatter(data: Record<string, string | number | boolean | undefined>): string {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${scalar(v as string | number | boolean)}`);
  return `---\n${lines.join('\n')}\n---`;
}

function scalar(value: string | number | boolean): string {
  if (typeof value !== 'string') return String(value);
  return /[:#[\]{}"'\n]|^\s|\s$/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

export interface ItemNoteOptions {
  /** Source titles for the `[[backlinks]]` (falls back to the id). */
  sourceTitles?: Record<string, string>;
  /** Basenames of the variant notes, to link down to them. */
  variantBasenames: string[];
}

export function renderItemNote(item: ContentItem, opts: ItemNoteOptions): string {
  const fm = frontmatter({
    forskai: 'content-item',
    id: item.id,
    campaign: item.campaignId,
    audience: item.audience,
    pillar: item.pillar,
    evidence_level: item.evidenceLevel,
    claim_risk: item.claimRisk,
    status: item.status,
  });

  const sources = item.sourceIds.length
    ? item.sourceIds.map((id) => `- [[${opts.sourceTitles?.[id] ?? id}]]`).join('\n')
    : '_none_';
  const variants = opts.variantBasenames.length
    ? opts.variantBasenames.map((base) => `- [[${base}]]`).join('\n')
    : '_none yet_';

  return (
    `${fm}\n\n# ${item.title}\n\n` +
    `## Sources\n${sources}\n\n## Variants\n${variants}\n`
  );
}

export interface VariantNoteOptions {
  /** Basename of the parent item note, for the backlink. */
  itemBasename: string;
}

export function renderVariantNote(variant: ContentVariant, opts: VariantNoteOptions): string {
  const cleared = variant.safetyReview ? variant.safetyReview.cleared : isCleared([]);
  const fm = frontmatter({
    forskai: 'content-variant',
    id: variant.id,
    item: variant.contentItemId,
    channel: variant.channel,
    format: variant.format,
    status: variant.status,
    review_cleared: cleared,
    scheduled_at: variant.scheduledAt,
    exported_at: variant.exportedAt,
  });

  const reviewNote = cleared
    ? ''
    : '\n> [!warning] Not cleared — this variant has unresolved blocking safety findings.';
  const hook = variant.hook ? `**${variant.hook}**\n\n` : '';

  return (
    `${fm}\n\n# ${variant.channel} · ${variant.format}\n\n` +
    `Part of:: [[${opts.itemBasename}]]${reviewNote}\n\n${hook}${variant.body}\n`
  );
}
