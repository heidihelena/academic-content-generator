import { Injectable } from '@nestjs/common';
import { SafetyService } from '../safety/safety.service';
import { SourcesService } from '../sources/sources.service';
import { coverArtDataUrl } from './cover-art';
import {
  CarouselRequest,
  CarouselResult,
  CarouselSlide,
  THEME_ACCENTS,
} from './carousel.types';

const MAX_POINTS = 4;
const TITLE_MAX = 88; // keep within the builder's legibility lint

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function shorten(text: string, max = TITLE_MAX): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return (at > 40 ? cut.slice(0, at) : cut).replace(/[,;:]$/, '') + '…';
}

/**
 * Generates a Vahtian carousel deck from a source — the agent-drivable bridge
 * between ForskAI content and the carousel builder. Composition is deterministic
 * and local-first; the generated slide text is run through the shared safety
 * review so overclaims surface (the carousel makes brand claims, where the
 * "no overclaim" rule matters most).
 */
@Injectable()
export class CarouselService {
  constructor(
    private readonly sources: SourcesService,
    private readonly safety: SafetyService,
  ) {}

  async generate(req: CarouselRequest): Promise<CarouselResult> {
    const source = await this.sources.get(req.sourceId); // 404 if missing
    const theme = THEME_ACCENTS[req.theme ?? ''] ? (req.theme as string) : 'vahtian';
    const bg: 'light' | 'navy' = req.bg === 'navy' ? 'navy' : 'light';
    const url = (req.url || 'vahtian.com').trim();

    const material = (source.abstract || source.body || '').trim();
    const points: CarouselSlide[] = splitSentences(material)
      .slice(0, MAX_POINTS)
      .map((sentence, i) => ({
        type: 'point',
        kicker: `POINT ${i + 1}`,
        title: shorten(sentence),
        body: '',
      }));

    const cover: CarouselSlide = {
      type: 'cover',
      kicker: theme.toUpperCase(),
      title: source.title,
      body: '',
      coverArt: coverArtDataUrl({ accent: THEME_ACCENTS[theme], bg, seed: source.id }),
    };

    const cta: CarouselSlide = {
      type: 'cta',
      kicker: '',
      title: 'Read more.',
      body: '',
      url,
    };

    const slides = [cover, ...points, cta];
    const caption = this.buildCaption(source.title, points, url, theme);
    const deck = { schema: 1, label: source.title, theme, bg, url, caption, slides };

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
