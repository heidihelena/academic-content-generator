import { Global, Module } from '@nestjs/common';
import { ProviderCredentialsService } from '../accounts/provider-credentials';
import { IntegrationRegistry } from './integration.registry';

@Global()
@Module({
  providers: [IntegrationRegistry, ProviderCredentialsService],
  exports: [IntegrationRegistry, ProviderCredentialsService],
})
export class IntegrationsModule {}
