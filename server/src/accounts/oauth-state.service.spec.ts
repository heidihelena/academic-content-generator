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
