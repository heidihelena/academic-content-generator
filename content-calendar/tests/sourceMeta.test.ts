import { beforeEach, describe, expect, it } from 'vitest';
import {
  getSourceMeta,
  markSourceUsed,
  resetSourceMeta,
  setSourceMeta,
  setSourceStatus,
} from '../src/sources/sourceMeta';

describe('sourceMeta', () => {
  beforeEach(() => resetSourceMeta());

  it('defaults every source to "new"', () => {
    expect(getSourceMeta('src_x')).toEqual({ status: 'new' });
  });

  it('sets and merges status, project and language', () => {
    setSourceMeta('src_x', { project: 'Heat study', language: 'English' });
    setSourceStatus('src_x', 'reviewed');
    expect(getSourceMeta('src_x')).toEqual({ status: 'reviewed', project: 'Heat study', language: 'English' });
  });

  it('marks a source used when a draft is saved from it', () => {
    markSourceUsed('src_y');
    expect(getSourceMeta('src_y').status).toBe('used');
  });

  it('persists to localStorage', () => {
    setSourceStatus('src_z', 'archived');
    const raw = window.localStorage.getItem('forskai.sourceMeta.v1');
    expect(raw).toContain('archived');
  });
});
