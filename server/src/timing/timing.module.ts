import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JsonFileStore } from '../persistence/json-file.store';
import { TimingController } from './timing.controller';
import {
  FileTimingRepository,
  InMemoryTimingRepository,
  TIMING_REPOSITORY,
  type TimingRepository,
} from './timing.repository';
import { TimingService } from './timing.service';
import { LearnedSlot } from './timing.types';

/** Timing optimizer (best-time-to-post heuristic + learned-from-outcomes bonus). */
@Module({
  imports: [ConfigModule],
  providers: [
    TimingService,
    {
      provide: TIMING_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TimingRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryTimingRepository();
        const path = process.env.TIMING_STORE_PATH ?? './data/timing.json';
        return new FileTimingRepository(new JsonFileStore<LearnedSlot>(path));
      },
    },
  ],
  controllers: [TimingController],
  exports: [TimingService],
})
export class TimingModule {}
