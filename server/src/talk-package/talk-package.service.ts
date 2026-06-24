import { Inject, Injectable } from '@nestjs/common';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ContentService } from '../content/content.service';
import { ContentPlanService } from '../content-plan/content-plan.service';
import { Audience, ContentVariant } from '../domain/academic';
import { isPatientFacing } from '../safety/patient-safe';
import { ReuseService } from '../reuse/reuse.service';
import { SafetyService } from '../safety/safety.service';
import { TALK_COMPOSER, TalkComposer } from './talk-composer.types';
import { TalkPackageRequest, TalkPackageResult } from './talk-package.types';
import { estimateMinutes, pointCountForDuration } from './talk-render';

const DEFAULT_DURATION_MIN = 12;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Generates a talk package from a source: a {@link ContentItem} (the idea) with
 * a long-form talk variant (the anchor) plus one short variant per genuine
 * point, under a persisted {@link Campaign} so the set shows up in the planner
 * as a real series. Composition flows through the shared {@link ContentPlan},
 * so the shorts say nothing the talk didn't; every variant carries its own
 * safety review, with an aggregate over the whole package.
 */
@Injectable()
export class TalkPackageService {
  constructor(
    private readonly plans: ContentPlanService,
    private readonly campaigns: CampaignsService,
    private readonly safety: SafetyService,
    private readonly content: ContentService,
    private readonly reuse: ReuseService,
    @Inject(TALK_COMPOSER) private readonly composer: TalkComposer,
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

    // What's already been made from this source — so the talk doesn't repeat it.
    const priorContext = await this.reuse.priorContext(req.sourceId);

    // Compose the talk and every short (Claude-backed when configured, local
    // scaffold otherwise) concurrently.
    const [talkBody, shortBodies] = await Promise.all([
      this.composer.composeTalk(plan, { durationMin, audience, priorContext }),
      Promise.all(
        plan.points.map((point, i) => this.composer.composeShort(plan, point, i, { url, audience })),
      ),
    ]);

    const item = await this.content.createItem(
      {
        title: plan.hook,
        sourceIds: [plan.sourceId],
        campaignId: campaign.id,
        audience,
        pillar: 'research-finding',
        evidenceLevel: 'unknown',
        claimRisk: isPatientFacing(audience) ? 'moderate' : 'low',
        status: 'reviewed',
      },
      now,
    );

    const talk = await this.content.addVariant(
      item.id,
      {
        channel: 'talk',
        format: 'talk-script',
        body: talkBody,
        status: 'reviewed',
        safetyReview: this.safety.review(talkBody, now, audience),
      },
      now,
    );

    const shorts: ContentVariant[] = [];
    for (const body of shortBodies) {
      shorts.push(
        await this.content.addVariant(
          item.id,
          {
            channel: 'shorts',
            format: 'short-script',
            body,
            status: 'reviewed',
            safetyReview: this.safety.review(body, now, audience),
          },
          now,
        ),
      );
    }

    const review = this.safety.review(
      [talk.body, ...shorts.map((s) => s.body)].join('\n'),
      now,
      audience,
    );

    return { campaign, item, plan, talk, shorts, review, estimatedMinutes: estimateMinutes(talk.body) };
  }
}
