import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAsyncAction } from '../src/hooks/useAsyncAction';

describe('useAsyncAction', () => {
  it('moves through loading → data on success', async () => {
    const { result } = renderHook(() => useAsyncAction(async (n: number) => n * 2));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();

    let returned: number | undefined;
    await act(async () => {
      returned = await result.current.run(21);
    });

    expect(returned).toBe(42);
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('captures an Error message on failure and returns undefined', async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => {
        throw new Error('boom');
      }),
    );

    let returned: unknown = 'sentinel';
    await act(async () => {
      returned = await result.current.run();
    });

    expect(returned).toBeUndefined();
    expect(result.current.error).toBe('boom');
    expect(result.current.data).toBeNull();
  });

  it('falls back to the provided message for non-Error throws', async () => {
    const { result } = renderHook(() =>
      useAsyncAction(
        async () => {
          throw 'nope';
        },
        { errorFallback: 'custom fallback' },
      ),
    );

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.error).toBe('custom fallback');
  });

  it('reset() clears data and error', async () => {
    const { result } = renderHook(() => useAsyncAction(async () => 'value'));

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.data).toBe('value');

    act(() => result.current.reset());
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
