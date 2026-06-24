import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ContentOutput } from '../domain/academic';
import {
  CampaignsService,
  CreateCampaignInput,
  UpdateCampaignInput,
} from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  /** GET /api/campaigns — list campaigns, newest first. */
  @Get()
  list() {
    return this.campaigns.list();
  }

  /** GET /api/campaigns/:id — fetch one campaign. */
  @Get(':id')
  get(@Param('id') id: string) {
    return this.campaigns.get(id);
  }

  /** POST /api/campaigns — create a campaign. */
  @Post()
  create(@Body() input: CreateCampaignInput) {
    return this.campaigns.create(input);
  }

  /** PATCH /api/campaigns/:id — update a campaign. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateCampaignInput) {
    return this.campaigns.update(id, input);
  }

  /** DELETE /api/campaigns/:id — remove a campaign. */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaigns.remove(id);
  }

  /** POST /api/campaigns/rollup — summarise supplied content items by status. */
  @Post('rollup')
  rollup(@Body() body: { outputs?: Pick<ContentOutput, 'status'>[] }) {
    return this.campaigns.rollup(body?.outputs ?? []);
  }
}
