import { describe, expect, it } from 'vitest';
import { splitIntoThread, threadLength, packToLimit, numberThread } from '../src/lib/thread';

describe('splitIntoThread', () => {
  it('returns a single un-numbered part when the text fits', () => {
    expect(splitIntoThread('Short and sweet.', 300)).toEqual(['Short and sweet.']);
  });

  it('returns nothing for empty input', () => {
    expect(splitIntoThread('   ', 300)).toEqual([]);
  });

  it('splits long copy into numbered, within-limit parts on sentence breaks', () => {
    const text =
      'Heatwaves do not hit a city evenly. Wealthier blocks have more street trees. ' +
      'Trees cool the air on hot days. So the coolest streets are often the richest. ' +
      'Lower-income blocks ran up to two degrees hotter in our study. Policy needs an equity lens.';
    const parts = splitIntoThread(text, 100);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(100);
    // Every part is numbered "(i/n)".
    parts.forEach((p, i) => expect(p).toMatch(new RegExp(`\\(${i + 1}/${parts.length}\\)$`)));
  });

  it('hard-splits a single sentence longer than the limit', () => {
    const long = 'word '.repeat(60).trim() + '.';
    const parts = splitIntoThread(long, 80);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(80);
  });

  it('threadLength reports the number of parts', () => {
    expect(threadLength('Short.', 300)).toBe(1);
    expect(threadLength('a. '.repeat(200), 100)).toBeGreaterThan(1);
  });
});

describe('packToLimit / numberThread', () => {
  it('packs to a width without adding numbering', () => {
    const parts = packToLimit('One sentence. Two sentence. Three sentence. Four sentence.', 25);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(25);
    for (const p of parts) expect(p).not.toMatch(/\(\d+\/\d+\)$/);
  });

  it('numbers multi-part threads but leaves a single part alone', () => {
    expect(numberThread(['only one'])).toEqual(['only one']);
    expect(numberThread(['a', 'b'])).toEqual(['a (1/2)', 'b (2/2)']);
  });
});
