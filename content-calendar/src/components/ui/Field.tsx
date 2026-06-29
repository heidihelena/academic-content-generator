import {
  forwardRef,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from './cn';

/** Form label — maps to the `.label` class. */
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('label', className)} {...props} />;
}

/** Text input — maps to the `.input` class. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return <input ref={ref} type={type} className={cn('input', className)} {...props} />;
  },
);

/** Multi-line input — `.input` with vertical resize disabled, as used app-wide. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn('input resize-none', className)} {...props} />;
  },
);

/** Select — maps to the `.input` class for visual parity with text inputs. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn('input', className)} {...props} />;
  },
);

interface FieldProps {
  label?: string;
  /** Associates the label with the control; also used for the hint/error ids. */
  htmlFor?: string;
  /** Helper text shown under the control (hidden when an error is present). */
  hint?: string;
  /** Error text shown under the control, in the danger color. */
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A labelled form row: label on top, the control (passed as children), and an
 * optional hint or error beneath. Standardizes the spacing and the error color
 * so forms stop hand-rolling `<label className="label">` + helper `<p>` markup.
 */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-[11px] text-status-failed" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
