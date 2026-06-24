import { Injectable } from '@nestjs/common';
import { ContentPlanService, shorten } from '../content-plan/content-plan.service';
import { SafetyService } from '../safety/safety.service';
import { coverArtDataUrl } from './cover-art';
import {
  CarouselRequest,
  CarouselResult,
  CarouselSlide,
  THEME_ACCENTS,
} from './carousel.types';

const MAX_POINTS = 4;
const TITLE_MAX = 88; // keep within the builder's legibility lint

/**
 * Renders a Vahtian carousel deck from a source — the agent-drivable bridge
 * between ForskAI content and the carousel builder. Composes a shared
 * {@link ContentPlan} (so it stays consistent with the talk/shorts renderers),
 * then runs the slide text through the shared safety review so overclaims
 * surface (the carousel makes brand claims, where the "no overclaim" rule
 * matters most).
 */
@Injectable()
export class CarouselService {
  constructor(
    private readonly plans: ContentPlanService,
    private readonly safety: SafetyService,
  ) {}

  async generate(req: CarouselRequest): Promise<CarouselResult> {
    const plan = await this.plans.fromSource(req.sourceId, { maxPoints: MAX_POINTS }); // 404 if missing
    const theme = THEME_ACCENTS[req.theme ?? ''] ? (req.theme as string) : 'vahtian';
    const bg: 'light' | 'navy' = req.bg === 'navy' ? 'navy' : 'light';
    const url = (req.url || 'vahtian.com').trim();

    const points: CarouselSlide[] = plan.points.map((point, i) => ({
      type: 'point',
      kicker: `POINT ${i + 1}`,
      title: shorten(point.claim, TITLE_MAX),
      body: '',
    }));

    const cover: CarouselSlide = {
      type: 'cover',
      kicker: theme.toUpperCase(),
      title: plan.hook,
      body: '',
      coverArt: coverArtDataUrl({ accent: THEME_ACCENTS[theme], bg, seed: plan.sourceId }),
    };

    const cta: CarouselSlide = {
      type: 'cta',
      kicker: '',
      title: plan.cta,
      body: '',
      url,
    };

    const slides = [cover, ...points, cta];
    const caption = this.buildCaption(plan.hook, points, url, theme);
    const deck = { schema: 1, label: plan.hook, theme, bg, url, caption, slides };

    // Run the shared safety review over all slide text (audience-aware).
    const review = this.safety.review(
      slides.map((s) => `${s.title} ${s.body ?? ''}`).join('\n'),
      new Date(),
      req.audience,
    );

    return { deck, review };
  }

  private buildCaption(
    title: string,
    points: CarouselSlide[],
    url: string,
    theme: string,
  ): string {
    const tag = (theme || 'Vahtian').replace(/[^A-Za-z]/g, '') || 'Vahtian';
    const lines = [title.replace(/\s+/g, ' ').trim()];
    if (points.length) {
      lines.push('', ...points.map((p) => `• ${p.title}`));
    }
    lines.push('', `→ ${url}`, '', `#${tag} #ResearchTools`);
    return lines.join('\n');
  }
}
