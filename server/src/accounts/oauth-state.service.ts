import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type { Platform } from '../domain/types';

interface PendingState {
  platform: Platform;
  expiresAt: number;
  /** PKCE code_verifier (RFC 7636) — required by providers like X. */
  codeVerifier: string;
  /** S256 code_challenge derived from the verifier, sent on the authorize URL. */
  codeChallenge: string;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Tracks in-flight OAuth `state` values for CSRF protection and to recover which
 * platform a callback belongs to (real providers redirect to a single callback
 * URL, so the platform must travel in `state`).
 *
 * In-memory and single-use with a 10-minute TTL. For multi-instance deploys,
 * back this with a shared store (Redis / the DB) instead.
 */
@Injectable()
export class OAuthStateService {
  private readonly states = new Map<string, PendingState>();
  private readonly ttlMs = 10 * 60 * 1000;

  create(platform: Platform): string {
    this.sweep();
    const state = randomUUID();
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
    this.states.set(state, {
      platform,
      expiresAt: Date.now() + this.ttlMs,
      codeVerifier,
      codeChallenge,
    });
    return state;
  }

  /** The PKCE code_challenge to put on the authorize URL (read-only; does not
   *  consume the state). Undefined for an unknown/expired state. */
  challengeFor(state: string): string | undefined {
    const entry = this.states.get(state);
    return entry && entry.expiresAt >= Date.now() ? entry.codeChallenge : undefined;
  }

  /** The PKCE code_verifier to send on token exchange. Read this BEFORE
   *  `consume`, which deletes the state. */
  verifierFor(state: string): string | undefined {
    const entry = this.states.get(state);
    return entry && entry.expiresAt >= Date.now() ? entry.codeVerifier : undefined;
  }

  /** Returns the platform for a valid, unexpired state and consumes it. */
  consume(state: string): Platform | null {
    const entry = this.states.get(state);
    if (!entry) return null;
    this.states.delete(state);
    if (entry.expiresAt < Date.now()) return null;
    return entry.platform;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [state, entry] of this.states) {
      if (entry.expiresAt < now) this.states.delete(state);
    }
  }
}
