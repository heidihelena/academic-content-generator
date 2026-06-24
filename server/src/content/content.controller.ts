import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ContentReviewService } from './content-review.service';
import {
  ContentService,
  CreateContentItemInput,
  CreateVariantInput,
  UpdateContentItemInput,
} from './content.service';

@Controller('content-items')
export class ContentItemsController {
  constructor(private readonly content: ContentService) {}

  /** GET /api/content-items?campaignId= — list ideas. */
  @Get()
  list(@Query('campaignId') campaignId?: string) {
    return this.content.listItems({ campaignId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.content.getItem(id);
  }

  @Post()
  create(@Body() input: CreateContentItemInput) {
    return this.content.createItem(input);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateContentItemInput) {
    return this.content.updateItem(id, input);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.content.removeItem(id);
    return { ok: true };
  }

  /** GET /api/content-items/:id/variants — the item's channel/format renderings. */
  @Get(':id/variants')
  listVariants(@Param('id') id: string) {
    return this.content.listVariants(id);
  }

  /** POST /api/content-items/:id/variants — add a variant. */
  @Post(':id/variants')
  addVariant(@Param('id') id: string, @Body() input: CreateVariantInput) {
    return this.content.addVariant(id, input);
  }
}

@Controller('content-variants')
export class ContentVariantsController {
  constructor(
    private readonly content: ContentService,
    private readonly review: ContentReviewService,
  ) {}

  /** POST /api/content-variants/:id/review/safety — run the medical-safety review. */
  @Post(':id/review/safety')
  runSafetyReview(@Param('id') id: string) {
    return this.review.runSafetyReview(id);
  }

  /** POST /api/content-variants/:id/review/citation — run the citation review. */
  @Post(':id/review/citation')
  runCitationReview(@Param('id') id: string) {
    return this.review.runCitationReview(id);
  }

  /** POST /api/content-variants/:id/mark-reviewed — human sign-off. */
  @Post(':id/mark-reviewed')
  markReviewed(@Param('id') id: string) {
    return this.review.markReviewed(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.content.getVariant(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() patch: Parameters<ContentService['updateVariant']>[1]) {
    return this.content.updateVariant(id, patch);
  }

  /** POST /api/content-variants/:id/schedule — set a date and move to `scheduled`. */
  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body('scheduledAt') scheduledAt: string) {
    return this.content.scheduleVariant(id, scheduledAt);
  }

  /** POST /api/content-variants/:id/publish — export the variant (gated by safety review). */
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.content.exportVariant(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.content.removeVariant(id);
    return { ok: true };
  }
}
