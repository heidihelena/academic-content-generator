import { BadRequestException } from '@nestjs/common';
import { SafetyService } from '../safety/safety.service';
import { ContentReviewService } from './content-review.service';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from './content.repository';
import { ContentService, CreateContentItemInput } from './content.service';

function setup() {
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
  const review = new ContentReviewService(content, new SafetyService());
  return { content, review };
}

const item = (over: Partial<CreateContentItemInput> = {}): CreateContentItemInput => ({
  title: 'X',
  audience: 'public',
  pillar: 'explainer',
  evidenceLevel: 'unknown',
  claimRisk: 'low',
  ...over,
});

describe('ContentReviewService', () => {
  it('runs the medical-safety review and records it (audience-aware)', async () => {
    const { content, review } = setup();
    const it = await content.createItem(item({ audience: 'public' }));
    const v = await content.addVariant(it.id, {
      channel: 'linkedin',
      format: 'post',
      body: 'This cures cancer and is 100% effective.',
    });
    const reviewed = await review.runSafetyReview(v.id);
    expect(reviewed.safetyReview).toBeDefined();
    expect(reviewed.safetyReview?.cleared).toBe(false);
  });

  it('runs the citation review, flagging a statistic that needs a citation', async () => {
    const { content, review } = setup();
    const it = await content.createItem(item());
    const v = await content.addVariant(it.id, {
      channel: 'linkedin',
      format: 'post',
      body: 'Coffee reduced mortality by 20% in the study.',
    });
    const reviewed = await review.runCitationReview(v.id);
    expect(reviewed.citationReview?.cleared).toBe(false);
    expect(reviewed.citationReview?.claims.some((c) => c.needsCitation)).toBe(true);
  });

  it('safety-cleared + human sign-off unlocks export', async () => {
    const { content, review } = setup();
    const it = await content.createItem(item({ audience: 'peers' }));
    const v = await content.addVariant(it.id, {
      channel: 'linkedin',
      format: 'post',
      body: 'A friendly, plain note about our work.',
    });

    const safe = await review.runSafetyReview(v.id);
    expect(safe.safetyReview?.cleared).toBe(true);

    // Cleared but not human-reviewed → still blocked.
    await expect(content.exportVariant(v.id)).rejects.toBeInstanceOf(BadRequestException);

    await review.markReviewed(v.id);
    expect((await content.exportVariant(v.id)).status).toBe('exported');
  });
});
