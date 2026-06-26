import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RATE_LIMITED_KEY } from './rate-limited.decorator';

interface RlRequest {
  user?: { userId?: string };
  route?: { path?: string };
  path?: string;
}

/**
 * Config-gated, per-user sliding-window rate limiter for the routes marked with
 * `@RateLimited()` (the expensive LLM-backed generative endpoints).
 *
 * Local-first: a no-op unless RATE_LIMIT_ENABLED=true. When on, each user gets
 * `RATE_LIMIT_PER_MIN` requests/minute per route; exceeding it returns 429. The
 * key is the resolved identity (`req.user.userId`, set by the auth guard, or
 * `'local'`), so it becomes per-tenant once tenancy lands — the OWASP
 * noisy-neighbor / AI-cost control for multi-tenant production.
 *
 * In-memory sliding window (a Map of recent timestamps per key); fine for a
 * single instance. A shared store (Redis) is the multi-instance follow-up.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs = 60_000;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const limited = this.reflector.getAllAndOverride<boolean>(RATE_LIMITED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!limited || !this.config.get<boolean>('rateLimit.enabled')) return true;

    const perMinute = this.config.get<number>('rateLimit.perMinute') ?? 30;
    const req = context.switchToHttp().getRequest<RlRequest>();
    const userId = req.user?.userId ?? 'local';
    const route = req.route?.path ?? req.path ?? 'route';
    const key = `${userId}:${route}`;

    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= perMinute) {
      throw new HttpException(
        `Rate limit exceeded: ${perMinute} requests/min`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
