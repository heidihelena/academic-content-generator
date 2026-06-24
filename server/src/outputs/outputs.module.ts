import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentOutput } from '../domain/academic';
import { JsonFileStore } from '../persistence/json-file.store';
import { OutputsController } from './outputs.controller';
import {
  FileOutputsRepository,
  InMemoryOutputsRepository,
  OUTPUTS_REPOSITORY,
  type OutputsRepository,
} from './outputs.repository';
import { OutputsService } from './outputs.service';

/** Generated-content store (system of record for talk/shorts/… outputs). */
@Module({
  imports: [ConfigModule],
  providers: [
    OutputsService,
    {
      // Durable JSON file when a non-memory persistence driver is configured,
      // in-memory otherwise (the local-first default).
      provide: OUTPUTS_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): OutputsRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryOutputsRepository();
        const path = process.env.OUTPUTS_STORE_PATH ?? './data/outputs.json';
        return new FileOutputsRepository(new JsonFileStore<ContentOutput>(path));
      },
    },
  ],
  controllers: [OutputsController],
  exports: [OutputsService],
})
export class OutputsModule {}
