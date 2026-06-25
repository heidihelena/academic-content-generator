import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

interface Req {
  headers: { authorization?: string };
  user?: { userId: string };
}

function contextFor(req: Req): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guardWith(
  values: Record<string, unknown>,
  isPublic = false,
): AuthGuard {
  const config = { get: (k: string) => values[k] } as unknown as ConfigService;
  const reflector = { getAllAndOverride: () => isPublic } as unknown as Reflector;
  return new AuthGuard(config, reflector);
}

const OPEN = { 'auth.defaultUserId': 'local' };
const SECURED = { 'auth.enabled': true, 'auth.token': 's3cret', 'auth.defaultUserId': 'local' };

describe('AuthGuard', () => {
  it('allows everything and sets the default identity when auth is disabled', () => {
    const req: Req = { headers: {} };
    expect(guardWith(OPEN).canActivate(contextFor(req))).toBe(true);
    expect(req.user).toEqual({ userId: 'local' });
  });

  it('fails safe (stays open) when enabled but no token is configured', () => {
    const req: Req = { headers: {} };
    const guard = guardWith({ 'auth.enabled': true, 'auth.defaultUserId': 'local' });
    expect(guard.canActivate(contextFor(req))).toBe(true);
    expect(req.user).toEqual({ userId: 'local' });
  });

  it('rejects a missing or malformed bearer token when secured', () => {
    const guard = guardWith(SECURED);
    expect(() => guard.canActivate(contextFor({ headers: {} }))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextFor({ headers: { authorization: 'Basic x' } }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong token and accepts the correct one when secured', () => {
    const guard = guardWith(SECURED);
    expect(() =>
      guard.canActivate(contextFor({ headers: { authorization: 'Bearer nope' } })),
    ).toThrow(UnauthorizedException);

    const req: Req = { headers: { authorization: 'Bearer s3cret' } };
    expect(guard.canActivate(contextFor(req))).toBe(true);
    expect(req.user).toEqual({ userId: 'local' });
  });

  it('allows a @Public() route without a token even when secured', () => {
    const req: Req = { headers: {} };
    const guard = guardWith(SECURED, /* isPublic */ true);
    expect(guard.canActivate(contextFor(req))).toBe(true);
    expect(req.user).toEqual({ userId: 'local' });
  });

  it('resolves per-user identity from AUTH_TOKENS (multi-user)', () => {
    const guard = guardWith({
      'auth.enabled': true,
      'auth.tokens': { alice: 'alice-token', bob: 'bob-token' },
      'auth.defaultUserId': 'local',
    });
    const alice: Req = { headers: { authorization: 'Bearer alice-token' } };
    expect(guard.canActivate(contextFor(alice))).toBe(true);
    expect(alice.user).toEqual({ userId: 'alice' });

    const bob: Req = { headers: { authorization: 'Bearer bob-token' } };
    expect(guard.canActivate(contextFor(bob))).toBe(true);
    expect(bob.user).toEqual({ userId: 'bob' });

    expect(() =>
      guard.canActivate(contextFor({ headers: { authorization: 'Bearer nope' } })),
    ).toThrow(UnauthorizedException);
  });
});
