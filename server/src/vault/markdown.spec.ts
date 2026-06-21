import { chunkId, chunkMarkdown, hashContent } from './markdown';

describe('chunkMarkdown', () => {
  it('splits a document into one chunk per heading', () => {
    const md = '# Title\n\nIntro\n\n## Section A\n\nbody a\n\n## Section B\n\nbody b';
    const chunks = chunkMarkdown(md);
    expect(chunks.map((c) => c.title)).toEqual(['Title', 'Section A', 'Section B']);
    expect(chunks[1].content).toContain('body a');
  });

  it('does not treat "#" inside a code fence as a heading', () => {
    const md = '# Real\n\n```\n# not a heading\n```\n';
    const chunks = chunkMarkdown(md);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].title).toBe('Real');
  });

  it('ignores empty sections', () => {
    expect(chunkMarkdown('\n\n   \n')).toEqual([]);
  });
});

describe('hashContent', () => {
  it('is deterministic and content-sensitive', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'));
    expect(hashContent('abc')).not.toBe(hashContent('abd'));
  });
});

describe('chunkId', () => {
  it('combines source path and ordinal', () => {
    expect(chunkId('notes/coffee.md', 2)).toBe('notes/coffee.md#2');
  });
});
