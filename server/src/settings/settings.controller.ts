import { Body, Controller, Get, Put } from '@nestjs/common';
import { LocalSettings } from './local-settings';
import { SettingsService } from './settings.service';

/**
 * Writable local settings for the Connections panel: read and save the local-Mac
 * paths (Obsidian vault, persistence driver, SQLite path) without hand-editing
 * `.env`. Non-secret only — the service drops any unknown/secret fields in the
 * body, so keys/tokens can't be written here.
 */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(): LocalSettings {
    return this.settings.get();
  }

  @Put()
  update(@Body() body: LocalSettings): LocalSettings {
    return this.settings.update(body ?? {});
  }
}
