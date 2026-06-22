import type { EvidenceLevel, Source } from '../types';

/**
 * Helpers for the academic "evidence" layer: how to label an evidence level,
 * normalize a DOI into a link, and render a citation compactly. Centralized so
 * the editor, cards, and review panel all describe sources the same way.
 */

export interface EvidenceMeta {
  level: EvidenceLevel;
  /** Short label for chips and selectors. */
  label: string;
  /** One-line meaning shown as help text. */
  description: string;
  /** Accent color (hex) for the chip/dot. */
  color: string;
}

/** Ordered weakest → strongest, which is also how they render in the selector. */
export const EVIDENCE_ORDER: EvidenceLevel[] = ['opinion', 'preliminary', 'peer_reviewed'];

export const EVIDENCE_META: Record<EvidenceLevel, EvidenceMeta> = {
  opinion: {
    level: 'opinion',
    label: 'Opinion / commentary',
    description: 'A personal take or interpretation — not a research finding.',
    color: '#828b86',
  },
  preliminary: {
    level: 'preliminary',
    label: 'Preliminary',
    description: 'Preprint or early results — not yet peer-reviewed.',
    color: '#e0a34b',
  },
  peer_reviewed: {
    level: 'peer_reviewed',
    label: 'Peer-reviewed',
    description: 'Published, peer-reviewed work. Link the source.',
    color: '#46a085',
  },
};

/** Levels for which a linked source is expected (peer-reviewed / preliminary). */
export function evidenceExpectsSource(level: EvidenceLevel | undefined): boolean {
  return level === 'peer_reviewed' || level === 'preliminary';
}

/** True when a Source carries any usable identifier or link. */
export function hasSourceLink(source: Source | undefined): boolean {
  return Boolean(source && (source.doi || source.url));
}

/**
 * Normalize a raw DOI or DOI URL into the bare DOI (e.g. "10.1038/abc").
 * Returns undefined for empty input. Accepts "doi:", "https://doi.org/…" forms.
 */
export function normalizeDoi(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim();
}

/** Build a resolvable URL for a Source: explicit url, else the DOI resolver. */
export function sourceUrl(source: Source | undefined): string | undefined {
  if (!source) return undefined;
  if (source.url) return source.url;
  const doi = normalizeDoi(source.doi);
  return doi ? `https://doi.org/${doi}` : undefined;
}

/**
 * Compact citation label for chips, e.g. "Nature · 2024" or "10.1038/abc".
 * Falls back through venue/year → title → DOI → "Source".
 */
export function sourceLabel(source: Source | undefined): string {
  if (!source) return 'Source';
  const venueYear = [source.venue, source.year].filter(Boolean).join(' · ');
  if (venueYear) return venueYear;
  if (source.title) return source.title;
  const doi = normalizeDoi(source.doi);
  if (doi) return doi;
  if (source.url) return source.url.replace(/^https?:\/\//, '');
  return 'Source';
}
