import { parseFrontmatter } from './frontmatter';

/** An Obsidian note read from the vault, mapped toward a SourceMaterial. */
export interface VaultNote {
  /** Path relative to the vault root (stable identifier). */
  path: string;
  title: string;
  authors?: string[];
  year?: number;
  doi?: string;
  tags: string[];
  body: string;
  /** ISO 8601 modified time. */
  modifiedAt: string;
}

function toStringArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const arr = Array.isArray(value) ? value : [value];
  const cleaned = arr.map((s) => s.trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

function toYear(value: string | string[] | undefined): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /\b(\d{4})\b/.exec(value);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  return year >= 1000 && year <= 9999 ? year : undefined;
}

function baseName(path: string): string {
  return path.replace(/\.md$/i, '').split('/').pop() ?? path;
}

/** Title precedence: front-matter `title` → first `# heading` → file name. */
function resolveTitle(
  fmTitle: string | string[] | undefined,
  content: string,
  path: string,
): string {
  if (typeof fmTitle === 'string' && fmTitle.trim()) return fmTitle.trim();
  const heading = /^#\s+(.+)$/m.exec(content);
  if (heading) return heading[1].trim();
  return baseName(path);
}

/** Builds a VaultNote from a note's raw content. Pure — no filesystem access. */
export function buildNote(path: string, raw: string, modifiedAt: string): VaultNote {
  const { data, content } = parseFrontmatter(raw);
  return {
    path,
    title: resolveTitle(data.title, content, path),
    authors: toStringArray(data.authors ?? data.author),
    year: toYear(data.year ?? data.date),
    doi: typeof data.doi === 'string' ? data.doi.trim() : undefined,
    tags: toStringArray(data.tags ?? data.tag) ?? [],
    body: content.trim(),
    modifiedAt,
  };
}
