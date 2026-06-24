import { Controller, Param, Post } from '@nestjs/common';
import { VaultExportService } from './vault-export.service';

@Controller()
export class VaultExportController {
  constructor(private readonly exporter: VaultExportService) {}

  /** POST /api/campaigns/:id/export — write every item in the campaign + an index. */
  @Post('campaigns/:id/export')
  exportCampaign(@Param('id') id: string) {
    return this.exporter.exportCampaign(id);
  }

  /** POST /api/content-items/:id/export — write the item hub + variant notes, backlinked. */
  @Post('content-items/:id/export')
  exportContentItem(@Param('id') id: string) {
    return this.exporter.exportContentItem(id);
  }
}
