import { buildNote } from './note';

const MTIME = '2026-03-01T00:00:00.000Z';

describe('buildNote', () => {
  it('maps front-matter fields onto a VaultNote', () => {
    const raw = [
      '---',
      'title: Street trees and heat',
      'authors: [A. Researcher, B. Scientist]',
      'year: 2024',
      'doi: 10.1/xyz',
      'tags: [urban, climate]',
      '---',
      'Tree cover was associated with cooler streets.',
    ].join('\n');
    const note = buildNote('papers/trees.md', raw, MTIME);
    expect(note.title).toBe('Street trees and heat');
    expect(note.authors).toEqual(['A. Researcher', 'B. Scientist']);
    expect(note.year).toBe(2024);
    expect(note.doi).toBe('10.1/xyz');
    expect(note.tags).toEqual(['urban', 'climate']);
    expect(note.body).toBe('Tree cover was associated with cooler streets.');
    expect(note.modifiedAt).toBe(MTIME);
  });

  it('falls back to the first heading for the title', () => {
    expect(buildNote('n.md', '# Heading title\n\nbody', MTIME).title).toBe('Heading title');
  });

  it('falls back to the file name when there is no title or heading', () => {
    expect(buildNote('folder/My Note.md', 'just text', MTIME).title).toBe('My Note');
  });

  it('extracts a year from a date string and defaults tags to []', () => {
    const note = buildNote('n.md', '---\ndate: 2023-05-01\n---\nx', MTIME);
    expect(note.year).toBe(2023);
    expect(note.tags).toEqual([]);
  });
});
