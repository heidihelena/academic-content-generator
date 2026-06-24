import { Body, Controller, Post } from '@nestjs/common';
import { CarouselRequest } from './carousel.types';
import { CarouselService } from './carousel.service';

@Controller('carousel')
export class CarouselController {
  constructor(private readonly carousel: CarouselService) {}

  /**
   * POST /api/carousel — generate a Vahtian carousel deck from a source.
   * Returns `{ deck, review }`: save `deck` as JSON and open it in the carousel
   * builder; `review` is the shared safety review of the slide text.
   */
  @Post()
  generate(@Body() req: CarouselRequest) {
    return this.carousel.generate(req);
  }
}
