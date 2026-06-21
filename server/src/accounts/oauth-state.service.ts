import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Platform } from '../domain/types';

interface PendingState {
  platform: Platform;
  expiresAt: number;
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
    this.states.set(state, { platform, expiresAt: Date.now() + this.ttlMs });
    return state;
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
