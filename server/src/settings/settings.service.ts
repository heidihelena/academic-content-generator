import { Injectable } from '@nestjs/common';
import { LocalSettings, readLocalSettings, writeLocalSettings } from './local-settings';

/**
 * Reads and writes the writable local settings file (the local-Mac paths the
 * Connections panel manages). Non-secret only; see {@link LocalSettings}.
 *
 * Path changes apply to the running server on next restart, since config is
 * resolved once at boot (see `configuration.ts`).
 */
@Injectable()
export class SettingsService {
  get(): LocalSettings {
    return readLocalSettings();
  }

  update(patch: LocalSettings): LocalSettings {
    return writeLocalSettings(patch);
  }
}
