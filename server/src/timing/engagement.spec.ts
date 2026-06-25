import { engagementScore, engagementSignal } from './engagement';

describe('engagement normalization', () => {
  it('weights reposts and replies above likes/clicks', () => {
    expect(engagementScore({ reposts: 1 })).toBeGreaterThan(engagementScore({ likes: 1 }));
    expect(engagementScore({ replies: 1 })).toBeGreaterThan(engagementScore({ clicks: 1 }));
  });

  it('uses a weighted engagement rate when impressions are known', () => {
    const low = engagementSignal({ impressions: 1000, likes: 5 });
    const high = engagementSignal({ impressions: 1000, likes: 50, reposts: 20 });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(1);
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it('saturates on raw reactions when impressions are unknown', () => {
    const some = engagementSignal({ likes: 5 });
    const lots = engagementSignal({ likes: 500 });
    expect(some).toBeGreaterThan(0);
    expect(lots).toBeGreaterThan(some);
    expect(lots).toBeLessThanOrEqual(1);
  });

  it('is 0 for no engagement', () => {
    expect(engagementSignal({})).toBe(0);
    expect(engagementSignal({ impressions: 1000 })).toBe(0);
  });
});
