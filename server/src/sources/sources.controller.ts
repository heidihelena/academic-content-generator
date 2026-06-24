import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateSourceInput, SourcesService } from './sources.service';

@Controller('sources')
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  /** GET /api/sources?q= — list all sources, or search when `q` is given. */
  @Get()
  list(@Query('q') q?: string) {
    return q ? this.sources.search(q) : this.sources.list();
  }

  /** GET /api/sources/:id — fetch one source. */
  @Get(':id')
  get(@Param('id') id: string) {
    return this.sources.get(id);
  }

  /** POST /api/sources — add a paper / note / link / lecture. */
  @Post()
  create(@Body() input: CreateSourceInput) {
    return this.sources.create(input);
  }
}
