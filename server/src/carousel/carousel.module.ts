import { Module } from '@nestjs/common';
import { ContentPlanModule } from '../content-plan/content-plan.module';
import { SafetyModule } from '../safety/safety.module';
import { CarouselController } from './carousel.controller';
import { CarouselService } from './carousel.service';

/** Carousel deck generator (ForskAI → Vahtian carousel builder). */
@Module({
  imports: [ContentPlanModule, SafetyModule],
  providers: [CarouselService],
  controllers: [CarouselController],
  exports: [CarouselService],
})
export class CarouselModule {}
