import { describe, expect, it } from 'vitest';
import {
  canGoBack,
  canGoForward,
  goBack,
  initialState,
  type StudioState,
} from '../src/studio/studioWorkflow';
import type { ReviewState } from '../src/studio/studioTypes';

const cleared: ReviewState = { claims: [], findings: [], cleared: true };
const blocked: ReviewState = {
  claims: [],
  findings: [{ severity: 'block', category: 'overclaiming', message: 'x' }],
  cleared: false,
};

function at(stage: StudioState['stage'], over: Partial<StudioState> = {}): StudioState {
  return { ...initialState(), stage, ...over };
}

describe('studio workflow guards', () => {
  it('starts at compose with nothing behind it and a blocked forward', () => {
    const s = initialState();
    expect(s.stage).toBe('compose');
    expect(canGoBack(s)).toBe(false);
    expect(canGoForward(s)).toBe(false);
  });

  it('compose requires both a title and material', () => {
    const input = initialState().input;
    expect(canGoForward(at('compose', { input: { ...input, title: 'T', material: 'M' } }))).toBe(true);
    expect(canGoForward(at('compose', { input: { ...input, title: 'T', material: '' } }))).toBe(false);
  });

  it('draft requires non-empty text', () => {
    expect(canGoForward(at('draft', { draft: 'hello' }))).toBe(true);
    expect(canGoForward(at('draft', { draft: '   ' }))).toBe(false);
  });

  it('review gates forward on a cleared review', () => {
    expect(canGoForward(at('review', { review: cleared }))).toBe(true);
    expect(canGoForward(at('review', { review: blocked }))).toBe(false);
    expect(canGoForward(at('review', { review: null }))).toBe(false);
  });

  it('ready is terminal but can step back', () => {
    expect(canGoForward(at('ready'))).toBe(false);
    expect(canGoBack(at('ready'))).toBe(true);
  });
});

describe('goBack', () => {
  it('steps back through the stages', () => {
    expect(goBack(at('draft')).stage).toBe('compose');
    expect(goBack(at('ready')).stage).toBe('review');
  });

  it('invalidates the review when leaving Review to revise', () => {
    const back = goBack(at('review', { review: blocked }));
    expect(back.stage).toBe('draft');
    expect(back.review).toBeNull();
  });

  it('does not move back from compose', () => {
    const s = at('compose');
    expect(goBack(s)).toBe(s);
  });
});
