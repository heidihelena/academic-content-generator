import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { generate } from 'selfsigned';

/**
 * Self-signed TLS material for the local HTTPS OAuth callback listener.
 *
 * Meta (Instagram/Threads) refuses OAuth redirects to plain http, even on
 * loopback ("Insecure Login Blocked", error 1349187). A tunnel or a public
 * relay would break the local-first promise, so instead the server exposes a
 * second, HTTPS listener on loopback with a self-signed certificate. The
 * browser shows a one-time "connection is not private" warning during the
 * OAuth hop — accept it and the flow completes entirely on this machine.
 *
 * The key pair is generated once (pure JS — no openssl/native deps, works in
 * the desktop bundle) and persisted owner-only so the browser exception
 * survives restarts.
 */
export interface TlsMaterial {
  key: string;
  cert: string;
}

export function tlsDir(): string {
  return process.env.FORSKAI_TLS_DIR ?? join(homedir(), 'forskai', 'tls');
}

export async function ensureSelfSignedCert(dir = tlsDir()): Promise<TlsMaterial> {
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');
  if (existsSync(keyPath) && existsSync(certPath)) {
    return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') };
  }

  const tenYears = new Date();
  tenYears.setFullYear(tenYears.getFullYear() + 10);
  const pems = await generate([{ name: 'commonName', value: '127.0.0.1' }], {
    notAfterDate: tenYears,
    keySize: 2048,
    extensions: [
      { name: 'basicConstraints', cA: false },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 7, ip: '127.0.0.1' }, // IP SAN — what the callback URL uses
          { type: 2, value: 'localhost' }, // DNS SAN — terminal-run convenience
        ],
      },
    ],
  });

  mkdirSync(dir, { recursive: true });
  writeFileSync(keyPath, pems.private, { mode: 0o600 });
  chmodSync(keyPath, 0o600);
  writeFileSync(certPath, pems.cert, { mode: 0o600 });
  chmodSync(certPath, 0o600);
  return { key: pems.private, cert: pems.cert };
}
