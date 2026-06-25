import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without authentication even when AUTH_ENABLED=true
 * (e.g. the health probe). The {@link AuthGuard} checks for this metadata.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
