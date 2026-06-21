import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import * as chokidar from 'chokidar';
import { VaultService } from './vault.service';

/**
 * Watches the markdown vault and re-ingests on change (add / edit / delete).
 *
 * Opt-in via VAULT_WATCH=true. Writes are debounced so a burst of saves (e.g.
 * Obsidian sync) triggers a single ingest. On multi-instance deploys, run the
 * watcher on exactly one instance to avoid redundant re-indexing.
 */
@Injectable()
export class VaultWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VaultWatcherService.name);
  private watcher?: chokidar.FSWatcher;
  private debounce?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly vault: VaultService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('vault.watch')) return;

    const path = this.config.get<string>('vault.path')!;
    if (!existsSync(path)) {
      this.logger.warn(`VAULT_WATCH enabled but vault path does not exist: ${path}`);
      return;
    }

    this.watcher = chokidar.watch('**/*.md', {
      cwd: path,
      ignoreInitial: true,
      ignored: /(^|[\\/])\../, // skip dotfiles (.obsidian, etc.)
      awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    });

    const onChange = (event: string, file: string) => {
      this.logger.debug(`Vault ${event}: ${file}`);
      this.scheduleIngest();
    };
    this.watcher
      .on('add', (f) => onChange('add', f))
      .on('change', (f) => onChange('change', f))
      .on('unlink', (f) => onChange('unlink', f));

    this.logger.log(`Watching vault for changes: ${path}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.debounce) clearTimeout(this.debounce);
    await this.watcher?.close();
  }

  /** Coalesce rapid changes into one ingest run ~1s after the last event. */
  private scheduleIngest(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      void this.vault
        .ingest()
        .catch((err) => this.logger.error(`Auto-ingest failed: ${err?.message ?? err}`));
    }, 1000);
  }
}
