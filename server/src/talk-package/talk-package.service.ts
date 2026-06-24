import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ContentPlanService } from '../content-plan/content-plan.service';
import { Audience, ContentChannel, ContentOutput } from '../domain/academic';
import { SafetyService } from '../safety/safety.service';
import { TalkPackageRequest, TalkPackageResult } from './talk-package.types';
import { pointCountForDuration, renderShort, renderTalk } from './talk-render';

const DEFAULT_DURATION_MIN = 12;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Generates a talk package from a source: a long-form talk (the anchor) plus
 * one short per genuine point, persisted as a {@link Campaign} so the set shows
 * up in the planner as a real series. Composition flows through the shared
 * {@link ContentPlan}, so the shorts say nothing the talk didn't; every piece
 * carries its own safety review, with an aggregate over the whole package.
 */
@Injectable()
export class TalkPackageService {
  constructor(
    private readonly plans: ContentPlanService,
    private readonly campaigns: CampaignsService,
    private readonly safety: SafetyService,
  ) {}

  async generate(req: TalkPackageRequest, now: Date = new Date()): Promise<TalkPackageResult> {
    const durationMin = clamp(req.durationMin ?? DEFAULT_DURATION_MIN, 3, 60);
    const audience: Audience = req.audience ?? 'peers';
    const url = (req.url || '').trim();

    // One reviewed plan; the number of points is bounded by the talk length and
    // by what the source actually offers (never padded to a target).
    const plan = await this.plans.fromSource(req.sourceId, {
      maxPoints: pointCountForDuration(durationMin),
    });

    const campaign = await this.campaigns.create(
      {
        title: req.campaignTitle?.trim() || `Talk package: ${plan.hook}`,
        goal: `~${durationMin}-min talk + ${plan.points.length} short${
          plan.points.length === 1 ? '' : 's'
        } from one source`,
        audience,
      },
      now,
    );

    const talkRender = renderTalk(plan, { durationMin, audience });
    const talk = this.output(plan.sourceId, campaign.id, 'talk', audience, talkRender.body, now);
    talk.reviewState = this.safety.review(talk.body, now, audience);

    const shorts = plan.points.map((point, i) => {
      const out = this.output(
        plan.sourceId,
        campaign.id,
        'shorts',
        audience,
        renderShort(plan, point, i, { url, audience }),
        now,
      );
      out.reviewState = this.safety.review(out.body, now, audience);
      return out;
    });

    const review = this.safety.review(
      [talk.body, ...shorts.map((s) => s.body)].join('\n'),
      now,
      audience,
    );

    return { campaign, plan, talk, shorts, review, estimatedMinutes: talkRender.estimatedMinutes };
  }

  private output(
    sourceId: string,
    campaignId: string,
    channel: ContentChannel,
    audience: Audience,
    body: string,
    now: Date,
  ): ContentOutput {
    const iso = now.toISOString();
    return {
      id: `out_${randomUUID()}`,
      sourceId,
      campaignId,
      channel,
      audience,
      body,
      status: 'draft',
      createdAt: iso,
      updatedAt: iso,
    };
  }
}
