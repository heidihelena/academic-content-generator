import { cn, type ClassValue } from './cn';

/**
 * A minimal `class-variance-authority`-style helper, implemented locally to keep
 * the design system dependency-free. Given a `base` class and a map of variants,
 * it returns a function that resolves the classes for a set of selected variant
 * values (falling back to `defaultVariants`) plus an optional `className`.
 *
 *   const button = cva('btn', {
 *     variants: { variant: { primary: 'btn-primary', ghost: 'btn-ghost' } },
 *     defaultVariants: { variant: 'primary' },
 *   });
 *   button({ variant: 'ghost', className: 'w-full' });
 *
 * Variant class strings are authored to not fight each other, so we don't need
 * `tailwind-merge`; the consumer `className` wins by coming last in source order.
 */
type VariantMap = Record<string, Record<string, ClassValue>>;

type VariantSelection<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K];
};

interface CvaConfig<V extends VariantMap> {
  variants?: V;
  defaultVariants?: VariantSelection<V>;
}

export function cva<V extends VariantMap>(base: ClassValue, config: CvaConfig<V> = {}) {
  const { variants, defaultVariants } = config;
  return (props: VariantSelection<V> & { className?: ClassValue } = {}): string => {
    const classes: ClassValue[] = [base];
    if (variants) {
      for (const key of Object.keys(variants) as (keyof V)[]) {
        const selected = (props[key] ?? defaultVariants?.[key]) as keyof V[typeof key] | undefined;
        if (selected != null) classes.push(variants[key][selected]);
      }
    }
    return cn(...classes, props.className);
  };
}

export type { VariantSelection };
