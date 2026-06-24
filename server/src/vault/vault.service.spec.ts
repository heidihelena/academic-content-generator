import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ConfigService } from '@nestjs/config';
import { VaultService } from './vault.service';

function makeVault(root: string): VaultService {
  const config = {
    get: (key: string) => (key === 'vault.path' ? root : undefined),
  } as unknown as ConfigService;
  // listNotes/getNote only use config; vectors/embeddings are unused here.
  return new VaultService(config, {} as never, {} as never);
}

describe('VaultService notes', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vault-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns [] when the vault path does not exist', async () => {
    expect(await makeVault(join(root, 'missing')).listNotes()).toEqual([]);
  });

  it('lists markdown notes (skipping dot-dirs) and reads one by path', async () => {
    await writeFile(join(root, 'a.md'), '---\ntitle: Note A\n---\nbody a');
    await mkdir(join(root, '.obsidian'), { recursive: true });
    await writeFile(join(root, '.obsidian', 'config.md'), 'ignored');
    await mkdir(join(root, 'sub'), { recursive: true });
    await writeFile(join(root, 'sub', 'b.md'), '# Note B\n\nbody b');

    const svc = makeVault(root);
    const notes = await svc.listNotes();
    expect(notes.map((n) => n.title).sort()).toEqual(['Note A', 'Note B']);

    const got = await svc.getNote('a.md');
    expect(got?.title).toBe('Note A');
    expect(got?.body).toBe('body a');
  });

  it('refuses path traversal in getNote', async () => {
    expect(await makeVault(root).getNote('../secret.md')).toBeNull();
  });
});
