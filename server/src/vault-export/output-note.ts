import { ContentOutput, isCleared } from '../domain/academic';

/**
 * Renders a stored {@link ContentOutput} as an Obsidian note: YAML frontmatter
 * (provenance + review status) and a body that backlinks to the source note.
 * This is a one-way projection — the outputs store stays the system of record,
 * so the note carries the output id and is safe to regenerate/overwrite.
 */

/** Filesystem-safe slug for a note filename. */
export function slugify(text: string, max = 60): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/g, '') || 'untitled'
  );
}

/** Serialise a flat object as YAML frontmatter, quoting strings when needed. */
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

export interface OutputNoteOptions {
  /** Source title, for the `[[backlink]]` to the source note. */
  sourceTitle?: string;
}

export function renderOutputNote(output: ContentOutput, opts: OutputNoteOptions = {}): string {
  const cleared = output.reviewState ? output.reviewState.cleared : isCleared([]);
  const fm = frontmatter({
    forskai: 'output',
    id: output.id,
    source: output.sourceId,
    source_title: opts.sourceTitle,
    campaign: output.campaignId,
    channel: output.channel,
    audience: output.audience,
    status: output.status,
    review_cleared: cleared,
    generated: output.createdAt,
  });

  const backlink = opts.sourceTitle ? `Source:: [[${opts.sourceTitle}]]` : `Source:: ${output.sourceId}`;
  const reviewNote = cleared
    ? ''
    : '\n> [!warning] Not cleared — this draft has unresolved blocking safety findings.';

  return `${fm}\n\n# ${output.channel} · ${output.audience}\n\n${backlink}${reviewNote}\n\n${output.body}\n`;
}
