import { Body, Controller, Post } from '@nestjs/common';
import { RenderService, type RenderPlan, type RenderRequest } from './render.service';

@Controller('render')
export class RenderController {
  constructor(private readonly render: RenderService) {}

  /** Render a vertical clip, or return the recipe to run it locally. */
  @Post('clip')
  clip(@Body() req: RenderRequest): Promise<RenderPlan> {
    return this.render.render(req);
  }
}
