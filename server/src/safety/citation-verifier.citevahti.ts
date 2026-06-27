import { spawn } from 'node:child_process';
import {
  CitationVerification,
  CitationVerifier,
  CitationVerifyInput,
} from './citation-verifier.types';

/**
 * Citation-support verifier backed by the CiteVahti CLI.
 *
 * Runs `citevahti claim-verify --claim "<claim>" --json` and pipes the source
 * text on stdin — a fully offline, no-Zotero check (see CiteVahti's
 * docs/INTEGRATION.md). CiteVahti returns a structured, deterministic result and
 * never asserts truth, which we map to our 4-state `CitationSupport`.
 *
 * Robustness is a hard requirement: a missing binary, a timeout, a non-zero exit,
 * or unparseable output all degrade to `unverifiable` with a reason — this
 * verifier never throws, so a flaky external tool can never crash a review or
 * block export on a false negative.
 */

/** The subset of CiteVahti's `claim-verify --json` schema we depend on. */
interface CiteVahtiVerifyJson {
  available?: boolean;
  coverage?: number;
  status?: 'terms_present' | 'terms_missing';
  contradiction?: boolean;
  polarity_cue?: string | null;
}

export interface CiteVahtiVerifierOptions {
  /** Path/name of the CiteVahti executable. */
  bin: string;
  /** Hard timeout (ms) for one verification. */
  timeoutMs: number;
  /** Injectable spawner — overridden in tests so no real process runs. */
  spawnFn?: typeof spawn;
}

function unverifiable(detail: string): CitationVerification {
  return { support: 'unverifiable', verifier: 'citevahti', detail };
}

export class CiteVahtiCitationVerifier implements CitationVerifier {
  readonly name = 'citevahti' as const;

  constructor(private readonly opts: CiteVahtiVerifierOptions) {}

  verify({ claim, sourceText }: CitationVerifyInput): Promise<CitationVerification> {
    const spawnFn = this.opts.spawnFn ?? spawn;
    return new Promise((resolve) => {
      // args array (no shell): the claim is passed safely, no injection risk.
      const child = spawnFn(
        this.opts.bin,
        ['claim-verify', '--claim', claim, '--json'],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );

      let stdout = '';
      let settled = false;
      const done = (v: CitationVerification) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      };

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        done(unverifiable(`timed out after ${this.opts.timeoutMs}ms`));
      }, this.opts.timeoutMs);

      child.stdout?.on('data', (d) => {
        stdout += d.toString();
      });
      child.on('error', (err: NodeJS.ErrnoException) => {
        // ENOENT = the binary isn't installed/on PATH — the common, expected case.
        done(
          unverifiable(
            err.code === 'ENOENT'
              ? `CiteVahti CLI not found ('${this.opts.bin}'); install it or set CITATION_VERIFIER=local`
              : `CiteVahti CLI failed to start: ${err.message}`,
          ),
        );
      });
      child.on('close', () => {
        // claim-verify exits 0 when the check ran (terms_present/terms_missing both
        // valid) and non-zero only when it couldn't — but it still emits JSON when
        // available, so parse stdout regardless of the exit code.
        let json: CiteVahtiVerifyJson;
        try {
          json = JSON.parse(stdout) as CiteVahtiVerifyJson;
        } catch {
          done(unverifiable('could not parse CiteVahti output'));
          return;
        }
        done(mapCiteVahti(json));
      });

      child.stdin?.end(sourceText);
    });
  }
}

/** Map CiteVahti's `claim-verify --json` result onto our 4-state support signal. */
export function mapCiteVahti(json: CiteVahtiVerifyJson): CitationVerification {
  if (!json.available) {
    return unverifiable('CiteVahti reported the check unavailable (empty text / no claim terms)');
  }
  if (json.contradiction) {
    return {
      support: 'contradicted',
      coverage: json.coverage,
      polarityCue: json.polarity_cue ?? null,
      verifier: 'citevahti',
    };
  }
  return {
    support: json.status === 'terms_present' ? 'supported' : 'unsupported',
    coverage: json.coverage,
    polarityCue: json.polarity_cue ?? null,
    verifier: 'citevahti',
  };
}
