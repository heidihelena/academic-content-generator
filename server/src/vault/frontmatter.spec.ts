import { parseFrontmatter } from './frontmatter';

describe('parseFrontmatter', () => {
  it('returns the raw content unchanged when there is no front matter', () => {
    const { data, content } = parseFrontmatter('# Title\n\nbody');
    expect(data).toEqual({});
    expect(content).toBe('# Title\n\nbody');
  });

  it('parses scalars, inline lists and block lists, and splits off the body', () => {
    const raw = [
      '---',
      'title: Sleep and memory',
      'doi: 10.1/abc',
      'aliases: [rest, recall]',
      'tags:',
      '  - neuro',
      '  - "sleep science"',
      '---',
      '',
      'The body starts here.',
    ].join('\n');
    const { data, content } = parseFrontmatter(raw);
    expect(data.title).toBe('Sleep and memory');
    expect(data.doi).toBe('10.1/abc');
    expect(data.aliases).toEqual(['rest', 'recall']);
    expect(data.tags).toEqual(['neuro', 'sleep science']);
    expect(content.trim()).toBe('The body starts here.');
  });

  it('does not treat a list item as belonging to a scalar key', () => {
    const { data } = parseFrontmatter('---\ntitle: X\n- stray\n---\nbody');
    expect(data.title).toBe('X');
  });
});
