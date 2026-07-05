import { mkdtempSync, readFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ensureSelfSignedCert } from './self-signed';

describe('ensureSelfSignedCert', () => {
  it('generates a loopback cert once, owner-only, and reuses it after', async () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'forskai-tls-')), 'tls');

    const first = await ensureSelfSignedCert(dir);
    expect(first.key).toContain('PRIVATE KEY');
    expect(first.cert).toContain('CERTIFICATE');
    expect(statSync(join(dir, 'key.pem')).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, 'cert.pem')).mode & 0o777).toBe(0o600);

    // Second call reads the persisted pair instead of regenerating, so the
    // browser's accepted certificate exception survives restarts.
    const second = await ensureSelfSignedCert(dir);
    expect(second.cert).toBe(readFileSync(join(dir, 'cert.pem'), 'utf8'));
    expect(second.cert).toBe(first.cert);
  });
});
