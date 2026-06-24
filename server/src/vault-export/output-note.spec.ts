import { ContentOutput } from '../domain/academic';
import { renderOutputNote, slugify } from './output-note';

function output(over: Partial<ContentOutput> = {}): ContentOutput {
  const iso = '2026-06-24T00:00:00.000Z';
  return {
    id: 'out_abc123',
    sourceId: 'src_1',
    campaignId: 'cmp_1',
    channel: 'talk',
    audience: 'peers',
    body: 'The talk body.',
    status: 'draft',
    createdAt: iso,
    updatedAt: iso,
    ...over,
  };
}

describe('slugify', () => {
  it('produces a filesystem-safe slug and falls back to untitled', () => {
    expect(slugify('Street Trees & Urban Heat!')).toBe('street-trees-urban-heat');
    expect(slugify('   ')).toBe('untitled');
  });
});

describe('renderOutputNote', () => {
  it('writes frontmatter, a source backlink and the body', () => {
    const note = renderOutputNote(output(), { sourceTitle: 'Trees & Heat' });
    expect(note).toContain('forskai: output');
    expect(note).toContain('id: out_abc123');
    expect(note).toContain('channel: talk');
    expect(note).toContain('review_cleared: true');
    expect(note).toContain('Source:: [[Trees & Heat]]');
    expect(note).toContain('The talk body.');
  });

  it('marks not-cleared drafts and falls back to the id backlink', () => {
    const note = renderOutputNote(
      output({ reviewState: { claims: [], findings: [], reviewedAt: 'x', cleared: false } }),
    );
    expect(note).toContain('review_cleared: false');
    expect(note).toContain('[!warning] Not cleared');
    expect(note).toContain('Source:: src_1');
  });
});
