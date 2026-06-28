import { OAuthStateService } from './oauth-state.service';

describe('OAuthStateService', () => {
  let service: OAuthStateService;

  beforeEach(() => {
    service = new OAuthStateService();
  });

  it('round-trips a platform through a state value', () => {
    const state = service.create('instagram');
    expect(service.consume(state)).toBe('instagram');
  });

  it('is single-use', () => {
    const state = service.create('linkedin');
    expect(service.consume(state)).toBe('linkedin');
    expect(service.consume(state)).toBeNull();
  });

  it('rejects unknown state', () => {
    expect(service.consume('not-a-real-state')).toBeNull();
  });

  it('issues a PKCE challenge/verifier pair per state, readable before consume', () => {
    const state = service.create('x');
    const challenge = service.challengeFor(state);
    const verifier = service.verifierFor(state);
    expect(challenge).toBeTruthy();
    expect(verifier).toBeTruthy();
    expect(challenge).not.toBe(verifier); // S256(verifier), not the verifier itself
    // base64url — no +, /, or = padding
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);

    // Two states get different verifiers.
    expect(service.verifierFor(service.create('x'))).not.toBe(verifier);

    // Still valid after reading; consume then invalidates.
    expect(service.consume(state)).toBe('x');
    expect(service.challengeFor(state)).toBeUndefined();
    expect(service.verifierFor(state)).toBeUndefined();
  });

  it('expires state after the TTL', () => {
    jest.useFakeTimers();
    try {
      const state = service.create('threads');
      jest.advanceTimersByTime(11 * 60 * 1000); // > 10 min TTL
      expect(service.consume(state)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
