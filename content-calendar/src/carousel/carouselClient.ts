import { ApiClient } from '../lib/api';
import type { Audience } from '../content/contentTypes';
import type { ReviewState, StudioAudience } from '../studio/studioTypes';
import { reviewDraft } from '../studio/studioReview';

/**
 * Carousel client — turns one source into a Vahtian carousel deck (cover →
 * points → CTA) plus a safety review of the slide text. The third "format" a
 * source can be optimized into directly (alongside long-form draft and ideas),
 * mirroring the backend `/carousel` and the sources/vault/idea-lab facades:
 *
 *  - `LocalCarouselClient` — deterministic, dependency-free deck templating from
 *    the source's title + material, with the shared local safety review. Works
 *    offline and in tests.
 *  - `ApiCarouselClient` — `POST /carousel` (shared ContentPlan + cover art +
 *    server safety review). Selected when `VITE_API_URL` is set.
 *
 * Switching backends is a config change, not a UI change.
 */

/** Slide kinds — mirrors the server's `CarouselSlideType`. */
export type CarouselSlideType =
  | 'cover'
  | 'point'
  | 'list'
  | 'code'
  | 'image'
  | 'quote'
  | 'cta';

/** One deck slide — mirrors the server's `CarouselSlide`. */
export interface CarouselSlide {
  type: CarouselSlideType;
  kicker?: string;
  title: string;
  body?: string;
  code?: string;
  url?: string;
  /** Embedded image (data URL). */
  img?: string;
  /** Generated cover background art (data URL) — cover slides only. */
  coverArt?: string;
}

/** A carousel deck — mirrors the server's `CarouselDeck` (loads into the builder). */
export interface CarouselDeck {
  schema: number;
  label: string;
  theme: string;
  bg: 'light' | 'navy';
  url: string;
  caption: string;
  slides: CarouselSlide[];
}

/** A generated deck plus the safety review of its slide text. */
export interface CarouselResult {
  deck: CarouselDeck;
  review: ReviewState;
}

/**
 * The minimum a source needs to render a deck. The API client uses only `id`
 * (the backend looks the source up); the local client templates from
 * `title` + `material`. Optional brand knobs mirror the server request.
 */
export interface CarouselSeed {
  id: string;
  title: string;
  material: string;
  theme?: string;
  bg?: 'light' | 'navy';
  url?: string;
  audience?: Audience;
}

export interface CarouselClient {
  generate(seed: CarouselSeed): Promise<CarouselResult>;
}

const MAX_POINTS = 4;
const TITLE_MAX = 88;

function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Split material into the first few sentence-like claims for point slides. */
function pointsFrom(material: string): string[] {
  return material
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_POINTS);
}

/** Local, dependency-free deck generator (deterministic for a given source). */
export class LocalCarouselClient implements CarouselClient {
  async generate(seed: CarouselSeed): Promise<CarouselResult> {
    const theme = (seed.theme || 'vahtian').trim();
    const bg: 'light' | 'navy' = seed.bg === 'navy' ? 'navy' : 'light';
    const url = (seed.url || 'vahtian.com').trim();
    const hook = shorten(seed.title || 'Untitled', TITLE_MAX);

    const claims = pointsFrom(seed.material);
    const points: CarouselSlide[] = claims.map((claim, i) => ({
      type: 'point',
      kicker: `POINT ${i + 1}`,
      title: shorten(claim, TITLE_MAX),
      body: '',
    }));
    const cover: CarouselSlide = { type: 'cover', kicker: theme.toUpperCase(), title: hook, body: '' };
    const cta: CarouselSlide = { type: 'cta', kicker: '', title: 'Read more', body: '', url };
    const slides = [cover, ...points, cta];

    const tag = theme.replace(/[^A-Za-z]/g, '') || 'Vahtian';
    const caption = [hook, ...(points.length ? ['', ...points.map((p) => `• ${p.title}`)] : []), '', `→ ${url}`, '', `#${tag} #ResearchTools`].join('\n');

    const deck: CarouselDeck = { schema: 1, label: hook, theme, bg, url, caption, slides };
    const review = reviewDraft(
      slides.map((s) => `${s.title} ${s.body ?? ''}`).join('\n'),
      (seed.audience as StudioAudience) ?? 'peers',
    );
    return { deck, review };
  }
}

/** Remote carousel client backed by the NestJS API. */
export class ApiCarouselClient implements CarouselClient {
  constructor(private readonly api: ApiClient) {}

  generate(seed: CarouselSeed): Promise<CarouselResult> {
    return this.api.post<CarouselResult>('/carousel', {
      sourceId: seed.id,
      theme: seed.theme,
      bg: seed.bg,
      url: seed.url,
      audience: seed.audience,
    });
  }
}

function createDefault(): CarouselClient {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiCarouselClient(new ApiClient(baseUrl)) : new LocalCarouselClient();
}

let active: CarouselClient = createDefault();

/** Override the active client (used by tests). */
export function setCarouselClient(client: CarouselClient): void {
  active = client;
}

export function generateCarousel(seed: CarouselSeed): Promise<CarouselResult> {
  return active.generate(seed);
}
