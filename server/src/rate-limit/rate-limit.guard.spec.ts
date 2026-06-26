import { ExecutionContext, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';

function context(userId = 'alice', route = '/api/ai/ideas'): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { userId }, route: { path: route } }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guard(values: Record<string, unknown>, limited = true): RateLimitGuard {
  const config = { get: (k: string) => values[k] } as unknown as ConfigService;
  const reflector = { getAllAndOverride: () => limited } as unknown as Reflector;
  return new RateLimitGuard(config, reflector);
}

describe('RateLimitGuard', () => {
  it('allows everything when disabled (local-first default)', () => {
    const g = guard({ 'rateLimit.enabled': false });
    for (let i = 0; i < 100; i++) expect(g.canActivate(context())).toBe(true);
  });

  it('allows non-@RateLimited routes even when enabled', () => {
    const g = guard({ 'rateLimit.enabled': true, 'rateLimit.perMinute': 1 }, /* limited */ false);
    expect(g.canActivate(context())).toBe(true);
    expect(g.canActivate(context())).toBe(true);
  });

  it('throws 429 after the per-minute limit is exceeded', () => {
    const g = guard({ 'rateLimit.enabled': true, 'rateLimit.perMinute': 3 });
    expect(g.canActivate(context())).toBe(true);
    expect(g.canActivate(context())).toBe(true);
    expect(g.canActivate(context())).toBe(true);
    try {
      g.canActivate(context());
      fail('expected a 429');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(429);
    }
  });

  it('limits per user and per route independently', () => {
    const g = guard({ 'rateLimit.enabled': true, 'rateLimit.perMinute': 1 });
    expect(g.canActivate(context('alice', '/api/ai/ideas'))).toBe(true);
    // Different user — own bucket.
    expect(g.canActivate(context('bob', '/api/ai/ideas'))).toBe(true);
    // Same user, different route — own bucket.
    expect(g.canActivate(context('alice', '/api/draft-studio'))).toBe(true);
    // Alice's ideas bucket is now full.
    expect(() => g.canActivate(context('alice', '/api/ai/ideas'))).toThrow(HttpException);
  });
});
