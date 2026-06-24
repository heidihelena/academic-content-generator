import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JsonFileStore } from '../persistence/json-file.store';
import { SourceMaterial } from '../domain/academic';
import { VaultModule } from '../vault/vault.module';
import { SourcesController } from './sources.controller';
import {
  FileSourcesRepository,
  InMemorySourcesRepository,
  SOURCES_REPOSITORY,
  type SourcesRepository,
} from './sources.repository';
import { SourcesService } from './sources.service';

/** Source Inbox for academic material (ForskAI Version 1, issue #28). */
@Module({
  imports: [VaultModule, ConfigModule],
  providers: [
    SourcesService,
    {
      // Durable JSON file when a non-memory persistence driver is configured,
      // in-memory otherwise (the local-first default).
      provide: SOURCES_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SourcesRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemorySourcesRepository();
        const path = process.env.SOURCES_STORE_PATH ?? './data/sources.json';
        return new FileSourcesRepository(new JsonFileStore<SourceMaterial>(path));
      },
    },
  ],
  controllers: [SourcesController],
  exports: [SourcesService],
})
export class SourcesModule {}
