import { BadRequestException, Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Platform } from '../domain/types';
import { IntegrationRegistry } from '../integrations/integration.registry';
import { AccountsService } from './accounts.service';
import { OAuthStateService } from './oauth-state.service';

/**
 * OAuth authorize + callback endpoints.
 *
 * Flow:
 *   1. Client hits  GET /api/accounts/oauth/:platform/authorize  → { authorizeUrl }
 *   2. Browser visits authorizeUrl (the provider's consent screen; the mock
 *      auto-approves and redirects straight back).
 *   3. Provider redirects to  GET /api/accounts/oauth/callback?code=&state=
 *   4. We verify `state`, exchange the `code` for tokens via the integration,
 *      persist the account, and redirect to FRONTEND_URL (or return JSON).
 *
 * `req`/`res` are typed loosely to avoid a hard @types/express dependency.
 */
@Controller('accounts/oauth')
export class OAuthController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly integrations: IntegrationRegistry,
    private readonly stateService: OAuthStateService,
    private readonly config: ConfigService,
  ) {}

  @Get(':platform/authorize')
  authorize(@Param('platform') platform: Platform, @Req() req: any) {
    const state = this.stateService.create(platform);
    const authorizeUrl = this.integrations
      .get(platform)
      .authorizeUrl(this.callbackUrl(req), state);
    return { authorizeUrl, state };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ): Promise<void> {
    const platform = state ? this.stateService.consume(state) : null;
    if (!platform) throw new BadRequestException('Invalid or expired OAuth state');
    if (!code) throw new BadRequestException('Missing authorization code');

    const account = await this.accounts.connect(platform, code);

    const frontendUrl = this.config.get<string>('frontendUrl');
    if (frontendUrl) {
      const status = account.status === 'connected' ? 'connected' : 'error';
      res.redirect(`${frontendUrl}/?${platform}=${status}`);
      return;
    }
    res.json(account);
  }

  private callbackUrl(req: any): string {
    const proto = req.headers['x-forwarded-proto'] ?? req.protocol ?? 'http';
    const host = req.headers['x-forwarded-host'] ?? req.headers.host;
    return `${proto}://${host}/api/accounts/oauth/callback`;
  }
}
