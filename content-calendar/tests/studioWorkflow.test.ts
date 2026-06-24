import { describe, expect, it } from 'vitest';
import {
  advance,
  canGoBack,
  canGoForward,
  goBack,
  initialState,
  type StudioState,
} from '../src/studio/studioWorkflow';

function composed(material = 'Rest helps recall.'): StudioState {
  return {
    ...initialState(),
    input: { title: 'Sleep', material, channel: 'linkedin', audience: 'peers', hook: '' },
  };
}

describe('studio workflow', () => {
  it('starts at compose with nothing behind it and a blocked forward', () => {
    const s = initialState();
    expect(s.stage).toBe('compose');
    expect(canGoBack(s)).toBe(false);
    expect(canGoForward(s)).toBe(false); // empty input
  });

  it('allows forward from compose once title + material are present', () => {
    expect(canGoForward(composed())).toBe(true);
  });

  it('composes a draft and then a review as it advances', () => {
    let s = advance(composed());
    expect(s.stage).toBe('draft');
    expect(s.draft).toContain('Sleep');

    s = advance(s);
    expect(s.stage).toBe('review');
    expect(s.review).not.toBeNull();
  });

  it('gates export on a cleared review and clears it when sent back', () => {
    let s = advance(advance(composed('This cures cancer.')));
    expect(s.stage).toBe('review');
    expect(s.review?.cleared).toBe(false);
    expect(canGoForward(s)).toBe(false); // blocked

    const back = goBack(s);
    expect(back.stage).toBe('draft');
    expect(back.review).toBeNull(); // invalidated, re-runs on next advance
  });

  it('reaches export only when the review clears', () => {
    let s = advance(advance(composed()));
    expect(s.review?.cleared).toBe(true);
    expect(canGoForward(s)).toBe(true);
    s = advance(s);
    expect(s.stage).toBe('ready');
    expect(canGoForward(s)).toBe(false); // terminal
  });

  it('re-reviews the edited draft on a revision', () => {
    let s = advance(composed());
    s = { ...s, draft: 'Coffee causes weight loss.' }; // warn for peers
    s = advance(s);
    expect(s.review?.findings.some((f) => f.category === 'causal-language')).toBe(true);
  });
});
