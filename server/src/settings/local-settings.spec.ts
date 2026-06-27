import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readLocalSettings, writeLocalSettings } from './local-settings';

describe('local-settings', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'forskai-settings-'));
    path = join(dir, 'nested', 'settings.json'); // nested → exercises mkdir
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('returns {} when the file does not exist', () => {
    expect(readLocalSettings(path)).toEqual({});
  });

  it('returns {} for malformed JSON instead of throwing', () => {
    const flat = join(dir, 'settings.json');
    writeFileSync(flat, '{ not json');
    expect(readLocalSettings(flat)).toEqual({});
  });

  it('writes the directory + file with 0600 and reads it back', () => {
    const saved = writeLocalSettings({ vaultPath: '/icloud/Vault', persistenceDriver: 'sqlite' }, path);
    expect(saved).toEqual({ vaultPath: '/icloud/Vault', persistenceDriver: 'sqlite' });
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(readLocalSettings(path)).toEqual({ vaultPath: '/icloud/Vault', persistenceDriver: 'sqlite' });
  });

  it('merges a patch over existing settings', () => {
    writeLocalSettings({ vaultPath: '/a', persistenceDriver: 'memory' }, path);
    const merged = writeLocalSettings({ sqlitePath: '/local/c.sqlite' }, path);
    expect(merged).toEqual({ vaultPath: '/a', persistenceDriver: 'memory', sqlitePath: '/local/c.sqlite' });
  });

  it('drops unknown and secret fields — only known string paths are written', () => {
    const saved = writeLocalSettings(
      { vaultPath: '/v', anthropicApiKey: 'sk-SECRET', appPassword: 'pw', empty: '   ' } as never,
      path,
    );
    expect(saved).toEqual({ vaultPath: '/v' });
    expect(readFileSync(path, 'utf8')).not.toMatch(/SECRET|appPassword/);
  });

  it('trims values and ignores blank ones', () => {
    expect(writeLocalSettings({ vaultPath: '  /v  ', sqlitePath: '   ' }, path)).toEqual({ vaultPath: '/v' });
  });
});
