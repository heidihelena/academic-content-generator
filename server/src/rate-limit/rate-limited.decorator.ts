import { SetMetadata } from '@nestjs/common';

export const RATE_LIMITED_KEY = 'rateLimited';

/**
 * Marks a route for per-user rate limiting by the {@link RateLimitGuard}. Applied
 * to the expensive LLM-backed generative endpoints (ideas, drafts, talks). A
 * no-op unless RATE_LIMIT_ENABLED=true.
 */
export const RateLimited = () => SetMetadata(RATE_LIMITED_KEY, true);
