import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { ReuseController } from './reuse.controller';
import { ReuseService } from './reuse.service';

/** Cross-campaign reuse over the content store (prior-work lookups + composer context). */
@Module({
  imports: [ContentModule],
  providers: [ReuseService],
  controllers: [ReuseController],
  exports: [ReuseService],
})
export class ReuseModule {}
