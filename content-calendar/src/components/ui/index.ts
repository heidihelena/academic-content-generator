/**
 * The forskAI design system — small, typed, variant-driven primitives built on
 * the Tailwind tokens in index.css. Zero runtime deps; shadcn/ui patterns
 * (cva-style variants, composable Card parts, a labelled Field) without the
 * dependency footprint. See docs/DESIGN_SYSTEM.md.
 */
export { cn } from './cn';
export { cva } from './cva';

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
export { Badge, type BadgeProps, type BadgeTone, type BadgeSize } from './Badge';
export { Field, Label, Input, Textarea, Select } from './Field';
export { ToggleGroup, type ToggleGroupProps, type ToggleOption } from './ToggleGroup';
export { Callout, type CalloutProps, type CalloutTone } from './Callout';
export { Heading, Text, type HeadingLevel, type TextVariant } from './Typography';

// Existing primitives, surfaced through the same entry point.
export { Spinner } from './Spinner';
export { EmptyState, LoadingState, ErrorState } from './States';
export { Modal } from './Modal';
export { Drawer } from './Drawer';
export { ConfirmDialog } from './ConfirmDialog';
