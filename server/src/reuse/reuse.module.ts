import { Module } from '@nestjs/common';
import { OutputsModule } from '../outputs/outputs.module';
import { ReuseController } from './reuse.controller';
import { ReuseService } from './reuse.service';

/** Cross-campaign reuse over the outputs store (prior-work lookups + composer context). */
@Module({
  imports: [OutputsModule],
  providers: [ReuseService],
  controllers: [ReuseController],
  exports: [ReuseService],
})
export class ReuseModule {}
