/**
 * Minimal YAML front-matter parser for Obsidian notes — enough for the common
 * shapes (scalars, inline `[a, b]` lists, and block `- item` lists) without
 * pulling in a YAML dependency. Anything fancier is ignored rather than failing.
 */
export interface Frontmatter {
  data: Record<string, string | string[]>;
  /** The note body after the front-matter block. */
  content: string;
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

export function parseFrontmatter(raw: string): Frontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, content: raw };

  const content = raw.slice(match[0].length);
  const data: Record<string, string | string[]> = {};
  let currentKey: string | null = null;

  for (const line of match[1].split(/\r?\n/)) {
    // Block list item ("  - value") belonging to the current key.
    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && currentKey && Array.isArray(data[currentKey])) {
      (data[currentKey] as string[]).push(stripQuotes(listItem[1].trim()));
      continue;
    }

    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, rest] = kv;
    const value = rest.trim();
    currentKey = key;

    if (value === '') {
      data[key] = []; // a block list may follow
    } else if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
    } else {
      data[key] = stripQuotes(value);
    }
  }

  return { data, content };
}
