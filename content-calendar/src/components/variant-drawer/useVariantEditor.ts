import { useEffect, useState } from 'react';
import type { ContentItem, ContentVariant, TimingSuggestion } from '../../content/contentTypes';
import { exportBlockers } from '../../content/contentTypes';
import { contentClient } from '../../content/contentClient';

/** Tomorrow 09:00 local — a sensible default schedule slot. */
function tomorrowMorning(): string {
  const at = new Date();
  at.setDate(at.getDate() + 1);
  at.setHours(9, 0, 0, 0);
  return at.toISOString();
}

/** Next future occurrence (UTC) of a given weekday (0–6) + hour. */
function nextOccurrence(weekday: number, hour: number, from: Date = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hour, 0, 0, 0));
  let days = (weekday - d.getUTCDay() + 7) % 7;
  if (days === 0 && d.getTime() <= from.getTime()) days = 7;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

interface UseVariantEditorArgs {
  item: ContentItem;
  variant: ContentVariant;
  onChange: (v: ContentVariant) => void;
}

/**
 * Owns the variant editor: the editable copy fields (re-seeded per variant),
 * best-time suggestions, and the review/publish actions. `run` tracks which
 * action is in flight by label so each button shows its own spinner.
 */
export function useVariantEditor({ item, variant, onChange }: UseVariantEditorArgs) {
  const [body, setBody] = useState(variant.body);
  const [hook, setHook] = useState(variant.hook ?? '');
  const [hashtags, setHashtags] = useState(variant.hashtags.join(', '));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TimingSuggestion[]>([]);

  // Re-seed the editable fields whenever a different variant is opened.
  useEffect(() => {
    setBody(variant.body);
    setHook(variant.hook ?? '');
    setHashtags(variant.hashtags.join(', '));
    setError(null);
  }, [variant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch best-time suggestions for this variant's channel + the item's audience.
  useEffect(() => {
    let live = true;
    contentClient
      .timingSuggestions(variant.channel, item.audience)
      .then((s) => live && setSuggestions(s.slice(0, 3)))
      .catch(() => live && setSuggestions([]));
    return () => {
      live = false;
    };
  }, [variant.channel, item.audience]);

  const dirty = body !== variant.body || hook !== (variant.hook ?? '') || hashtags !== variant.hashtags.join(', ');

  const run = async (label: string, fn: () => Promise<ContentVariant>) => {
    setBusy(label);
    setError(null);
    try {
      onChange(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    run('save', () =>
      contentClient.updateVariant(variant.id, {
        body,
        hook: hook || undefined,
        hashtags: hashtags.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    );
  const runSafetyReview = () => run('safety', () => contentClient.runSafetyReview(variant.id));
  const runCitationReview = () => run('citation', () => contentClient.runCitationReview(variant.id));
  const markReviewed = () => run('review', () => contentClient.markReviewed(variant.id));
  const scheduleDefault = () => run('schedule', () => contentClient.schedule(variant.id, tomorrowMorning()));
  const scheduleSuggestion = (s: TimingSuggestion) =>
    run('schedule', () => contentClient.schedule(variant.id, nextOccurrence(s.weekday, s.hour)));
  const publish = () => run('publish', () => contentClient.publish(variant.id));

  const blockers = exportBlockers(variant);
  const exportable = blockers.length === 0;

  return {
    body,
    setBody,
    hook,
    setHook,
    hashtags,
    setHashtags,
    busy,
    error,
    dirty,
    suggestions,
    blockers,
    exportable,
    save,
    runSafetyReview,
    runCitationReview,
    markReviewed,
    scheduleDefault,
    scheduleSuggestion,
    publish,
  };
}
