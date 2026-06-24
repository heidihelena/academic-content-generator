import { Module } from '@nestjs/common';
import { SafetyModule } from '../safety/safety.module';
import { SourcesModule } from '../sources/sources.module';
import { CarouselController } from './carousel.controller';
import { CarouselService } from './carousel.service';

/** Carousel deck generator (ForskAI → Vahtian carousel builder). */
@Module({
  imports: [SafetyModule, SourcesModule],
  providers: [CarouselService],
  controllers: [CarouselController],
  exports: [CarouselService],
})
export class CarouselModule {}
