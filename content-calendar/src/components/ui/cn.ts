/**
 * Join class names, dropping falsy values. A tiny, dependency-free stand-in for
 * `clsx` — enough for our variant maps, which are authored to not overlap (so we
 * don't need `tailwind-merge` to resolve conflicting utilities). The caller's
 * `className` is always appended last, so a consumer can still override.
 */
export type ClassValue = string | number | null | undefined | false;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}
