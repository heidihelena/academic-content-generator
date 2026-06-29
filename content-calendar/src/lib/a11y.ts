import type { KeyboardEvent } from 'react';

/**
 * Make a non-button element (e.g. a clickable table row) keyboard-operable:
 * fire `handler` on Enter or Space, matching native button behaviour. Pair with
 * `tabIndex={0}` and an `aria-label` describing the action.
 */
export function onActivate(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}
