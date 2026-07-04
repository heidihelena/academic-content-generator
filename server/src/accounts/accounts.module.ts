import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { OAuthController } from './oauth.controller';
import { OAuthStateService } from './oauth-state.service';
import { ProviderCredentialsController } from './provider-credentials.controller';

@Module({
  providers: [AccountsService, OAuthStateService],
  controllers: [AccountsController, OAuthController, ProviderCredentialsController],
  exports: [AccountsService],
})
export class AccountsModule {}
