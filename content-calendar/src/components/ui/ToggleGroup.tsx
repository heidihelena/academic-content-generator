import type { ReactNode } from 'react';
import { cn } from './cn';

export interface ToggleOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Text color applied when this option is active (brand / platform / evidence hue). */
  activeColor?: string;
}

export interface ToggleGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T | null | undefined;
  /** Emits the picked value, or `null` when a selected, deselectable option is re-clicked. */
  onChange: (value: T | null) => void;
  /** Accessible name for the group of buttons. */
  ariaLabel: string;
  size?: 'sm' | 'md';
  /** When true, clicking the active option clears the selection. */
  deselectable?: boolean;
  className?: string;
}

/**
 * A single-select segmented control: a row of equal-width buttons where exactly
 * one (or, when `deselectable`, zero) is active. Replaces the hand-rolled
 * "pick one" button rows. Built on the `.btn` class for visual parity, with
 * `role="group"` + `aria-pressed` so it's announced and operable like a real
 * toggle set.
 */
export function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  deselectable = false,
  className,
}: ToggleGroupProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex gap-1.5', className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(deselectable && active ? null : opt.value)}
            className={cn(
              'btn flex-1',
              size === 'sm' ? 'py-1.5 text-[11px]' : 'py-2',
              active ? 'bg-surface-600' : 'bg-surface-800 hover:bg-surface-700',
            )}
            style={active && opt.activeColor ? { color: opt.activeColor } : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
