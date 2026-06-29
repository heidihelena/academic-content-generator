import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva } from './cva';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

/**
 * Maps to the `.btn-*` component classes in index.css (the single source of
 * truth for button styling, so the variants here never drift from the raw
 * Tailwind layer). `size` layers utilities on top — utilities sit in a later
 * cascade layer than components, so `sm` reliably overrides the base padding.
 */
const button = cva('', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
    },
    size: {
      sm: 'py-1.5 text-xs',
      md: '',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable the button while an action is in flight. */
  loading?: boolean;
}

/**
 * The app's button. Variant-driven, with a built-in `loading` state so async
 * actions get a consistent spinner + disabled treatment everywhere.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading = false, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={button({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
});
