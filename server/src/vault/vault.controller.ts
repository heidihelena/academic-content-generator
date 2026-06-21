import { Controller, Get, Post, Query } from '@nestjs/common';
import { VaultService } from './vault.service';

@Controller('vault')
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  /** Trigger (re)ingestion of the markdown vault. */
  @Post('ingest')
  ingest() {
    return this.vault.ingest();
  }

  /** Semantic search over the vault: GET /vault/search?q=...&k=5 */
  @Get('search')
  search(@Query('q') q: string, @Query('k') k?: string) {
    return this.vault.search(q ?? '', k ? parseInt(k, 10) : 5);
  }
}
