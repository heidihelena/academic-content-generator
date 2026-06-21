import { Global, Module } from '@nestjs/common';
import { IntegrationRegistry } from './integration.registry';

@Global()
@Module({
  providers: [IntegrationRegistry],
  exports: [IntegrationRegistry],
})
export class IntegrationsModule {}
