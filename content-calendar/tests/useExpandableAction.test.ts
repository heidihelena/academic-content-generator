import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExpandableAction } from '../src/components/source-inbox/useExpandableAction';
import type { Source } from '../src/sources/sourcesTypes';

const SOURCE: Source = {
  id: 's1',
  kind: 'paper',
  title: 'A source',
  tags: [],
  importedAt: '2026-01-01T00:00:00.000Z',
};

describe('useExpandableAction', () => {
  it('toggle opens + runs, and re-toggling while idle collapses', async () => {
    const { result } = renderHook(() => useExpandableAction(async () => 'data'));

    await act(async () => {
      await result.current.toggle(SOURCE);
    });
    expect(result.current.activeId).toBe('s1');
    expect(result.current.data).toBe('data');

    act(() => {
      result.current.toggle(SOURCE);
    });
    expect(result.current.activeId).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('retry re-runs after an error WITHOUT collapsing the panel', async () => {
    let calls = 0;
    const fn = async () => {
      calls += 1;
      if (calls === 1) throw new Error('boom');
      return 'ok';
    };
    const { result } = renderHook(() => useExpandableAction(fn));

    await act(async () => {
      await result.current.toggle(SOURCE);
    });
    expect(result.current.error).toBe('boom');
    expect(result.current.activeId).toBe('s1'); // panel stays open on error

    // Regression: toggle() here would collapse the panel; retry() must re-run.
    await act(async () => {
      await result.current.retry(SOURCE);
    });
    expect(result.current.activeId).toBe('s1'); // still open
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('ok');
  });
});
