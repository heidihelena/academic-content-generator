import { useState } from 'react';
import type { ThreadAudience } from '../../ai/threadTypes';
import { planShortsFromVideo } from '../../ai/shortsService';
import { fetchTranscript } from '../../lib/transcript';
import { getPlatformMeta } from '../../lib/platforms';
import { useStore } from '../../store/useStore';
import { useAsyncAction } from '../../hooks/useAsyncAction';

/**
 * Owns the Video → Shorts flow: the inputs, the two async actions (transcript
 * fetch and shorts planning, each a useAsyncAction triad), and adding the plan
 * to the calendar. Pure logic.
 */
export function useVideoToShorts() {
  const createShortDrafts = useStore((s) => s.createShortDrafts);

  const [videoUrl, setVideoUrlRaw] = useState('');
  const [transcript, setTranscript] = useState('');
  const [count, setCount] = useState(4);
  const [audience, setAudience] = useState<ThreadAudience>('general public');
  const [added, setAdded] = useState(false);

  const fetchAction = useAsyncAction((url: string) => fetchTranscript(url), {
    errorFallback: 'Could not fetch transcript.',
  });
  const planAction = useAsyncAction(
    (args: { transcript: string; videoUrl?: string; count: number; audience: ThreadAudience }) =>
      planShortsFromVideo(args),
    { errorFallback: 'Failed to plan shorts.' },
  );

  // Editing the URL invalidates any prior fetch verification.
  const setVideoUrl = (url: string) => {
    setVideoUrlRaw(url);
    fetchAction.reset();
  };

  // Verify-or-redo: pull captions, confirm we got them, then proceed.
  const fetchTranscriptFromUrl = async () => {
    const url = videoUrl.trim();
    if (!url) return;
    const res = await fetchAction.run(url);
    if (res) setTranscript(res.transcript);
  };

  const planShorts = async () => {
    setAdded(false);
    await planAction.run({ transcript, videoUrl: videoUrl || undefined, count, audience });
  };

  const addToCalendar = () => {
    const result = planAction.data;
    if (!result) return;
    createShortDrafts(
      result.shorts.map((s) => ({ hook: s.hook, caption: s.caption, startSeconds: s.startSeconds })),
      { platform: 'youtube', audience, videoUrl: videoUrl || undefined },
    );
    setAdded(true);
  };

  return {
    videoUrl,
    setVideoUrl,
    transcript,
    setTranscript,
    count,
    setCount,
    audience,
    setAudience,
    // transcript fetch
    fetching: fetchAction.loading,
    fetchError: fetchAction.error,
    fetchOk: fetchAction.data?.cueCount ?? null,
    fetchTranscriptFromUrl,
    // shorts plan
    planning: planAction.loading,
    planError: planAction.error,
    result: planAction.data,
    planShorts,
    // calendar
    added,
    addToCalendar,
    limit: getPlatformMeta('youtube').characterLimit,
  };
}
