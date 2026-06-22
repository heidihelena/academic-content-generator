import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Platform } from '../domain/types';
import { AccountsService, type PlatformCredentials } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list() {
    return this.accounts.list();
  }

  @Post(':platform/connect')
  connect(@Param('platform') platform: Platform, @Body('code') code?: string) {
    return this.accounts.connect(platform, { code });
  }

  /** Verify user-supplied credentials and connect (Bluesky / Mastodon). */
  @Post(':platform/verify')
  verify(@Param('platform') platform: Platform, @Body() creds: PlatformCredentials) {
    return this.accounts.verify(platform, creds ?? {});
  }

  @Post(':platform/disconnect')
  disconnect(@Param('platform') platform: Platform) {
    return this.accounts.disconnect(platform);
  }
}
