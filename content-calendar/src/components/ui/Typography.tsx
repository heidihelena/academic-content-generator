import { type HTMLAttributes, type ElementType } from 'react';
import { cn } from './cn';

/**
 * The typography scale, as two small components. These encode the handful of
 * text styles the app actually uses so headings and body copy stay consistent
 * instead of re-deriving `text-sm font-semibold text-slate-200` everywhere.
 *
 * Scale (see docs/DESIGN_SYSTEM.md):
 *   Heading 1 — page title        text-lg  / semibold / slate-100
 *   Heading 2 — panel title       text-sm  / semibold / slate-200
 *   Heading 3 — item/sub title    text-sm  / medium   / slate-200
 *   Text body      text-sm  / slate-200
 *   Text secondary text-sm  / slate-300
 *   Text muted     text-xs  / slate-500
 *   Text tiny      text-[11px] / slate-500
 */
export type HeadingLevel = 1 | 2 | 3;

const HEADING: Record<HeadingLevel, string> = {
  1: 'text-lg font-semibold text-slate-100',
  2: 'text-sm font-semibold text-slate-200',
  3: 'text-sm font-medium text-slate-200',
};

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  /** Override the rendered tag while keeping the level's styling. */
  as?: ElementType;
}

export function Heading({ level = 2, as, className, ...props }: HeadingProps) {
  const Tag = (as ?? (`h${level}` as ElementType)) as ElementType;
  return <Tag className={cn(HEADING[level], className)} {...props} />;
}

export type TextVariant = 'body' | 'secondary' | 'muted' | 'tiny';

const TEXT: Record<TextVariant, string> = {
  body: 'text-sm text-slate-200',
  secondary: 'text-sm text-slate-300',
  muted: 'text-xs text-slate-500',
  tiny: 'text-[11px] text-slate-500',
};

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  as?: ElementType;
}

export function Text({ variant = 'body', as = 'p', className, ...props }: TextProps) {
  const Tag = as as ElementType;
  return <Tag className={cn(TEXT[variant], className)} {...props} />;
}
