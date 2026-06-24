import { Controller, Param, Post } from '@nestjs/common';
import { VaultExportService } from './vault-export.service';

@Controller()
export class VaultExportController {
  constructor(private readonly exporter: VaultExportService) {}

  /** POST /api/outputs/:id/export — write one output to the vault. */
  @Post('outputs/:id/export')
  exportOutput(@Param('id') id: string) {
    return this.exporter.exportOutput(id);
  }

  /** POST /api/campaigns/:id/export — write a whole campaign's outputs + an index. */
  @Post('campaigns/:id/export')
  exportCampaign(@Param('id') id: string) {
    return this.exporter.exportCampaign(id);
  }
}
