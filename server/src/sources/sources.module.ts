import { Module } from '@nestjs/common';
import { VaultModule } from '../vault/vault.module';
import { SourcesController } from './sources.controller';
import { InMemorySourcesRepository, SOURCES_REPOSITORY } from './sources.repository';
import { SourcesService } from './sources.service';

/** Source Inbox for academic material (ForskAI Version 1, issue #28). */
@Module({
  imports: [VaultModule],
  providers: [
    SourcesService,
    { provide: SOURCES_REPOSITORY, useClass: InMemorySourcesRepository },
  ],
  controllers: [SourcesController],
  exports: [SourcesService],
})
export class SourcesModule {}
