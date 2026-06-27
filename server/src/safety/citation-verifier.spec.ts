import { EventEmitter } from 'node:events';
import type { ConfigService } from '@nestjs/config';
import {
  CiteVahtiCitationVerifier,
  mapCiteVahti,
} from './citation-verifier.citevahti';
import { citationFinding } from './citation-finding';
import { createCitationVerifier } from './citation-verifier.factory';
import { LocalCitationVerifier } from './citation-verifier.local';

describe('LocalCitationVerifier', () => {
  const v = new LocalCitationVerifier();

  it('reports supported when the source carries the claim terms', async () => {
    const r = await v.verify({
      claim: 'Aspirin reduces cardiovascular events',
      sourceText: 'In the randomized trial, aspirin reduced cardiovascular events.',
    });
    expect(r.support).toBe('supported');
    expect(r.coverage).toBeGreaterThanOrEqual(0.5);
    expect(r.verifier).toBe('local');
  });

  it('reports unsupported when the source is off-topic', async () => {
    const r = await v.verify({
      claim: 'Statins lower cholesterol',
      sourceText: 'The conference dinner was held on a boat.',
    });
    expect(r.support).toBe('unsupported');
  });

  it('flags a polarity conflict as contradicted, not a verdict', async () => {
    const r = await v.verify({
      claim: 'Aspirin reduces cardiovascular events',
      sourceText: 'Aspirin did not reduce cardiovascular events in this cohort.',
    });
    expect(r.support).toBe('contradicted');
    expect(r.polarityCue).toBeTruthy();
  });

  it('is unverifiable with empty source text', async () => {
    const r = await v.verify({ claim: 'Aspirin reduces events', sourceText: '   ' });
    expect(r.support).toBe('unverifiable');
  });
});

describe('mapCiteVahti', () => {
  it('maps unavailable to unverifiable', () => {
    expect(mapCiteVahti({ available: false }).support).toBe('unverifiable');
  });
  it('maps contradiction to contradicted with the cue', () => {
    const r = mapCiteVahti({ available: true, contradiction: true, polarity_cue: 'not' });
    expect(r.support).toBe('contradicted');
    expect(r.polarityCue).toBe('not');
  });
  it('maps terms_present to supported and terms_missing to unsupported', () => {
    expect(mapCiteVahti({ available: true, status: 'terms_present' }).support).toBe('supported');
    expect(mapCiteVahti({ available: true, status: 'terms_missing' }).support).toBe('unsupported');
  });
});

// A fake `spawn` so no real CiteVahti process runs in tests.
function fakeSpawn(opts: { stdout?: string; errorCode?: string; hang?: boolean }) {
  return ((..._args: unknown[]) => {
    const child = new EventEmitter() as EventEmitter & Record<string, unknown>;
    const stdout = new EventEmitter();
    child.stdout = stdout;
    child.stderr = new EventEmitter();
    child.stdin = { end: (_d: string) => undefined };
    child.kill = () => undefined;
    setImmediate(() => {
      if (opts.errorCode) {
        const e = new Error('spawn failed') as NodeJS.ErrnoException;
        e.code = opts.errorCode;
        child.emit('error', e);
        return;
      }
      if (opts.hang) return; // never closes → exercises the timeout path
      if (opts.stdout) stdout.emit('data', Buffer.from(opts.stdout));
      child.emit('close', 0);
    });
    return child;
  }) as unknown as typeof import('node:child_process').spawn;
}

describe('CiteVahtiCitationVerifier', () => {
  it('parses claim-verify --json into a support signal', async () => {
    const v = new CiteVahtiCitationVerifier({
      bin: 'citevahti',
      timeoutMs: 1000,
      spawnFn: fakeSpawn({
        stdout: JSON.stringify({ available: true, status: 'terms_present', coverage: 0.8 }),
      }),
    });
    const r = await v.verify({ claim: 'x reduces y', sourceText: 'x reduced y' });
    expect(r.support).toBe('supported');
    expect(r.coverage).toBe(0.8);
    expect(r.verifier).toBe('citevahti');
  });

  it('degrades to unverifiable when the binary is missing (ENOENT)', async () => {
    const v = new CiteVahtiCitationVerifier({
      bin: 'nope',
      timeoutMs: 1000,
      spawnFn: fakeSpawn({ errorCode: 'ENOENT' }),
    });
    const r = await v.verify({ claim: 'a', sourceText: 'b' });
    expect(r.support).toBe('unverifiable');
    expect(r.detail).toContain('not found');
  });

  it('degrades to unverifiable on unparseable output', async () => {
    const v = new CiteVahtiCitationVerifier({
      bin: 'citevahti',
      timeoutMs: 1000,
      spawnFn: fakeSpawn({ stdout: 'not json' }),
    });
    expect((await v.verify({ claim: 'a', sourceText: 'b' })).support).toBe('unverifiable');
  });

  it('degrades to unverifiable on timeout', async () => {
    const v = new CiteVahtiCitationVerifier({
      bin: 'citevahti',
      timeoutMs: 20,
      spawnFn: fakeSpawn({ hang: true }),
    });
    const r = await v.verify({ claim: 'a', sourceText: 'b' });
    expect(r.support).toBe('unverifiable');
    expect(r.detail).toContain('timed out');
  });
});

describe('createCitationVerifier (factory)', () => {
  const cfg = (provider?: string): ConfigService =>
    ({
      get: (key: string) =>
        key === 'safety.citationVerifier.provider'
          ? provider
          : key === 'safety.citationVerifier.timeoutMs'
            ? 8000
            : 'citevahti',
    }) as unknown as ConfigService;

  it('defaults to the local heuristic', () => {
    expect(createCitationVerifier(cfg(undefined)).name).toBe('local');
  });
  it('uses CiteVahti when configured', () => {
    expect(createCitationVerifier(cfg('citevahti')).name).toBe('citevahti');
  });
});

describe('citationFinding (map to the safety/export gate)', () => {
  it('blocks export on a contradiction', () => {
    const f = citationFinding({ support: 'contradicted', verifier: 'local', polarityCue: 'not' });
    expect(f?.severity).toBe('block');
    expect(f?.category).toBe('citation-unsupported');
  });
  it('warns on unsupported', () => {
    expect(citationFinding({ support: 'unsupported', verifier: 'local' })?.severity).toBe('warn');
  });
  it('is advisory (info), never blocking, on unverifiable', () => {
    expect(citationFinding({ support: 'unverifiable', verifier: 'citevahti' })?.severity).toBe('info');
  });
  it('raises NOTHING for supported (not a "verified" stamp)', () => {
    expect(citationFinding({ support: 'supported', verifier: 'local' })).toBeNull();
  });
});
