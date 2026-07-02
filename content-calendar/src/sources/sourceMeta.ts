import { useSyncExternalStore } from 'react';

/**
 * Client-side source metadata overlay — the review lifecycle and organisation
 * fields the researcher manages per source (status, project, language). Kept as
 * a localStorage overlay keyed by source id so it works identically for local
 * sources, API sources and read-only vault notes, without a server change.
 * Stays local.
 */

export const SOURCE_STATUSES = ['new', 'reviewed', 'used', 'archived'] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export interface SourceMeta {
  status: SourceStatus;
  project?: string;
  language?: string;
}

export type SourceMetaMap = Record<string, SourceMeta>;

const STORAGE_KEY = 'forskai.sourceMeta.v1';
const DEFAULT_META: SourceMeta = { status: 'new' };

let cache: SourceMetaMap | null = null;
const listeners = new Set<() => void>();

function load(): SourceMetaMap {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SourceMetaMap) : null;
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    cache = {};
  }
  return cache;
}

function save(next: SourceMetaMap): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort persistence; the in-memory copy still works.
  }
  listeners.forEach((fn) => fn());
}

export function getSourceMeta(sourceId: string): SourceMeta {
  return load()[sourceId] ?? DEFAULT_META;
}

export function setSourceMeta(sourceId: string, patch: Partial<SourceMeta>): void {
  const current = getSourceMeta(sourceId);
  save({ ...load(), [sourceId]: { ...current, ...patch } });
}

export function setSourceStatus(sourceId: string, status: SourceStatus): void {
  setSourceMeta(sourceId, { status });
}

/** Mark a source as used (called when a draft made from it is saved). */
export function markSourceUsed(sourceId: string): void {
  setSourceMeta(sourceId, { status: 'used' });
}

/** Reset the store (tests). */
export function resetSourceMeta(next: SourceMetaMap = {}): void {
  save(next);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** React hook: the live source-meta map. */
export function useSourceMetaMap(): SourceMetaMap {
  return useSyncExternalStore(subscribe, load, load);
}
