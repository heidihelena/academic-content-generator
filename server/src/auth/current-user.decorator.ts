import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the authenticated user's id (set by {@link AuthGuard} as `req.user`).
 * Falls back to `'local'` so controllers work identically in the open,
 * single-user default — the same value the guard assigns when auth is off.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ user?: { userId?: string } }>();
    return req.user?.userId ?? 'local';
  },
);
