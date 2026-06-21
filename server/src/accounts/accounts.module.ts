import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { OAuthController } from './oauth.controller';
import { OAuthStateService } from './oauth-state.service';

@Module({
  providers: [AccountsService, OAuthStateService],
  controllers: [AccountsController, OAuthController],
  exports: [AccountsService],
})
export class AccountsModule {}
