import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDurableStore } from '../persistence/durable-store';
import { TimingController } from './timing.controller';
import {
  InMemoryTimingRepository,
  StoreBackedTimingRepository,
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
        return new StoreBackedTimingRepository(
          createDurableStore<LearnedSlot>({
            driver,
            filePath: process.env.TIMING_STORE_PATH ?? './data/timing.json',
            sqlitePath: config.get<string>('persistence.sqlitePath')!,
            table: 'timing_slots',
          }),
        );
      },
    },
  ],
  controllers: [TimingController],
  exports: [TimingService],
})
export class TimingModule {}
