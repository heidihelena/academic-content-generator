import { Audience, ReviewState } from '../domain/academic';

/** Vahtian carousel deck schema (loads directly into the carousel builder). */
export type CarouselSlideType = 'cover' | 'point' | 'list' | 'code' | 'image' | 'quote' | 'cta';

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

export interface CarouselDeck {
  schema: number;
  label: string;
  theme: string;
  bg: 'light' | 'navy';
  url: string;
  caption: string;
  slides: CarouselSlide[];
}

export interface CarouselRequest {
  sourceId: string;
  /** Brand theme key (accent + glyph); defaults to `vahtian`. */
  theme?: string;
  bg?: 'light' | 'navy';
  url?: string;
  audience?: Audience;
}

/** A generated deck plus the safety review of its slide text. */
export interface CarouselResult {
  deck: CarouselDeck;
  review: ReviewState;
}

/** Theme → accent, mirroring the carousel builder's THEMES. */
export const THEME_ACCENTS: Record<string, string> = {
  vahtian: '#8B6FC9',
  citevahti: '#8B6FC9',
  studyvahti: '#5566B5',
  dictvahti: '#5566B5',
  reviewvahti: '#1E9E8A',
  guidelinevahti: '#C98A00',
  atlasvahti: '#C24D7E',
  'matchvahti-lite': '#8B6FC9',
  matchvahti: '#8B6FC9',
  fullvahti: '#1E9E8A',
  methodvahti: '#5566B5',
};
