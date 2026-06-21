import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Platform } from '../domain/types';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list() {
    return this.accounts.list();
  }

  @Post(':platform/connect')
  connect(@Param('platform') platform: Platform, @Body('code') code?: string) {
    return this.accounts.connect(platform, code);
  }

  @Post(':platform/disconnect')
  disconnect(@Param('platform') platform: Platform) {
    return this.accounts.disconnect(platform);
  }
}
