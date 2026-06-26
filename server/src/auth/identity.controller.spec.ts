import { ConfigService } from '@nestjs/config';
import { IdentityController } from './identity.controller';

function controllerWith(values: Record<string, unknown>): IdentityController {
  const config = { get: (k: string) => values[k] } as unknown as ConfigService;
  return new IdentityController(config);
}

describe('IdentityController', () => {
  it('reports the user id and authEnabled=false when auth is off', () => {
    expect(controllerWith({ 'auth.enabled': false }).me('local')).toEqual({
      userId: 'local',
      authEnabled: false,
    });
  });

  it('reports authEnabled=true when enabled with a shared token', () => {
    expect(controllerWith({ 'auth.enabled': true, 'auth.token': 's3cret' }).me('local')).toEqual({
      userId: 'local',
      authEnabled: true,
    });
  });

  it('reports authEnabled=true when enabled with per-user tokens', () => {
    expect(
      controllerWith({ 'auth.enabled': true, 'auth.tokens': { alice: 'a' } }).me('alice'),
    ).toEqual({ userId: 'alice', authEnabled: true });
  });

  it('reports authEnabled=false when enabled but no token is configured (fail-safe)', () => {
    expect(controllerWith({ 'auth.enabled': true }).me('local').authEnabled).toBe(false);
  });
});
