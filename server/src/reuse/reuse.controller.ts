import { Controller, Get, Param } from '@nestjs/common';
import { ReuseService } from './reuse.service';

@Controller('sources')
export class ReuseController {
  constructor(private readonly reuse: ReuseService) {}

  /** GET /api/sources/:id/reuse — what has already been generated from this source. */
  @Get(':id/reuse')
  summary(@Param('id') id: string) {
    return this.reuse.summary(id);
  }
}
