import { forwardRef, type ElementType, type HTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * Surface container. `Card` is the bordered panel (`.card`); the sub-parts give
 * a consistent header / title / description / content / footer rhythm so panels
 * across the app share the same internal spacing instead of ad-hoc padding.
 *
 *   <Card>
 *     <CardHeader>
 *       <CardTitle>Connected accounts</CardTitle>
 *     </CardHeader>
 *     <CardContent>…</CardContent>
 *   </Card>
 *
 * Padding is not forced on `Card` itself, so existing `card p-4`/`p-5` usages
 * and the composed sub-parts can coexist during the migration.
 *
 * Polymorphic via `as` so a panel can stay a semantic element — e.g.
 * `<Card as="section" aria-label="…">` keeps the landmark/region role.
 */
interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { as, className, ...props },
  ref,
) {
  const Tag = (as ?? 'div') as ElementType;
  return <Tag ref={ref} className={cn('card', className)} {...props} />;
});

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start gap-2 px-4 pt-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold text-slate-200', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-slate-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-surface-700 px-4 py-3', className)}
      {...props}
    />
  );
}
