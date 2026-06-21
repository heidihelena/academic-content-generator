import { createHash } from 'crypto';

export interface ParsedChunk {
  title?: string;
  content: string;
}

/**
 * Splits a markdown document into section chunks by heading. Each chunk carries
 * the nearest heading as its title. Front matter and code-fence contents are
 * kept as-is. This is intentionally simple — swap in a smarter splitter
 * (token-aware, overlap windows) without changing the ingestion contract.
 */
export function chunkMarkdown(markdown: string): ParsedChunk[] {
  const lines = markdown.split('\n');
  const chunks: ParsedChunk[] = [];
  let title: string | undefined;
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    const content = buffer.join('\n').trim();
    if (content) chunks.push({ title, content });
    buffer = [];
  };

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) inFence = !inFence;
    const heading = !inFence && /^#{1,6}\s+/.test(line);
    if (heading) {
      flush();
      title = line.replace(/^#{1,6}\s+/, '').trim();
    }
    buffer.push(line);
  }
  flush();
  return chunks;
}

/** Stable id for a chunk: source path + ordinal. */
export function chunkId(source: string, index: number): string {
  return `${source}#${index}`;
}

/** Content hash used to skip re-embedding unchanged chunks. */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
