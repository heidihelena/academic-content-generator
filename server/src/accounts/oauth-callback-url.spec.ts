import { ConfigService } from '@nestjs/config';
import { OAuthController } from './oauth.controller';
import { OAuthStateService } from './oauth-state.service';
import type { AccountsService } from './accounts.service';
import type { IntegrationRegistry } from '../integrations/integration.registry';
import type { PlatformIntegration } from '../integrations/integration.types';

/** Registry stub whose integration records the redirectUri handed to it. */
function registryCapturing(seen: string[]): IntegrationRegistry {
  const integration: Partial<PlatformIntegration> = {
    authorizeUrl: (redirectUri: string) => {
      seen.push(redirectUri);
      return `https://provider.example/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`;
    },
  };
  return { get: () => integration } as unknown as IntegrationRegistry;
}

function controllerWith(values: Record<string, unknown>, seen: string[]): OAuthController {
  const config = { get: (k: string) => values[k] } as unknown as ConfigService;
  return new OAuthController(
    {} as AccountsService,
    registryCapturing(seen),
    new OAuthStateService(),
    config,
  );
}

const req = { headers: { host: '127.0.0.1:47615' }, protocol: 'http' };

describe('OAuth callback URL selection', () => {
  it('routes Meta platforms through the self-signed HTTPS listener when configured', () => {
    const seen: string[] = [];
    const controller = controllerWith({ oauthHttpsPort: 47616 }, seen);
    controller.authorize('instagram', req);
    controller.authorize('threads', req);
    expect(seen).toEqual([
      'https://127.0.0.1:47616/api/accounts/oauth/callback',
      'https://127.0.0.1:47616/api/accounts/oauth/callback',
    ]);
  });

  it('keeps http-tolerant platforms on the request host (registered URLs stay valid)', () => {
    const seen: string[] = [];
    const controller = controllerWith({ oauthHttpsPort: 47616 }, seen);
    controller.authorize('linkedin', req);
    expect(seen).toEqual(['http://127.0.0.1:47615/api/accounts/oauth/callback']);
  });

  it('falls back to the request host for Meta too when no HTTPS listener exists', () => {
    const seen: string[] = [];
    const controller = controllerWith({}, seen);
    controller.authorize('instagram', req);
    expect(seen).toEqual(['http://127.0.0.1:47615/api/accounts/oauth/callback']);
  });
});
