import { BadRequestException, Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import type { Platform } from '../domain/types';
import { IntegrationRegistry } from '../integrations/integration.registry';
import {
  PROVIDER_CREDENTIAL_PLATFORMS,
  ProviderCredentialsService,
} from './provider-credentials';

/**
 * Manage OAuth *provider* (developer-app) credentials from the app UI — the
 * Client ID/Secret LinkedIn or X issue for your app. Secrets are stored
 * encrypted on this machine and are NEVER returned by any endpoint; reads are
 * configured/not-configured booleans only.
 */
@Controller('accounts/provider-credentials')
export class ProviderCredentialsController {
  constructor(
    private readonly store: ProviderCredentialsService,
    private readonly registry: IntegrationRegistry,
  ) {}

  @Get()
  configured() {
    return this.store.configured();
  }

  @Put(':platform')
  save(
    @Param('platform') platform: Platform,
    @Body() body: { clientId?: string; clientSecret?: string },
  ) {
    this.assertSupported(platform);
    const clientId = body.clientId?.trim();
    const clientSecret = body.clientSecret?.trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Both the Client ID and the Client Secret are required.');
    }
    this.store.set(platform, { clientId, clientSecret });
    this.registry.invalidate(platform); // rebuild the real client on next use
    return { platform, configured: true };
  }

  @Delete(':platform')
  remove(@Param('platform') platform: Platform) {
    this.assertSupported(platform);
    this.store.delete(platform);
    this.registry.invalidate(platform);
    return { platform, configured: false };
  }

  private assertSupported(platform: Platform): void {
    if (!PROVIDER_CREDENTIAL_PLATFORMS.includes(platform)) {
      throw new BadRequestException(
        `${platform} does not take app credentials here — connect it directly on the Connections screen.`,
      );
    }
  }
}
