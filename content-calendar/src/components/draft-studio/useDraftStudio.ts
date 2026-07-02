import { useEffect, useState } from 'react';
import type { DraftReviewStatus, StudioChannel, StudioInput, StudioSeed } from '../../studio/studioTypes';
import {
  type StudioState,
  canGoBack,
  canGoForward,
  emptyInput,
  goBack,
  initialState,
} from '../../studio/studioWorkflow';
import { composeStudioDraft, reviewStudioDraft, suggestStudioHook } from '../../studio/studioEngine';
import {
  transformDraft,
  type RewriteAction,
  type StudioLanguage,
} from '../../studio/studioTransforms';
import { markSourceUsed } from '../../sources/sourceMeta';
import { useStore } from '../../store/useStore';
import type { Platform } from '../../types';

/** Map a content channel to the calendar platform it posts to. */
const CHANNEL_PLATFORM: Record<StudioChannel, Platform> = {
  linkedin: 'linkedin',
  threads: 'threads',
  instagram: 'instagram',
  // No native platform — save as a LinkedIn-style text draft to plan it.
  newsletter: 'linkedin',
  teaching: 'linkedin',
  explainer: 'linkedin',
  'video-script': 'youtube',
};

/** Tomorrow at 09:00 local — a sensible default slot for a saved draft. */
function tomorrowMorning(): string {
  const at = new Date();
  at.setDate(at.getDate() + 1);
  at.setHours(9, 0, 0, 0);
  return at.toISOString();
}

/**
 * The Draft Studio workflow: owns the compose→draft→review→ready state machine
 * and every action (forward/back, hook suggestion, save/copy/download). Pure
 * logic — the stage components render from what it returns.
 */
export function useDraftStudio(seed?: StudioSeed | null) {
  const createThreadFromParts = useStore((s) => s.createThreadFromParts);
  const [state, setState] = useState<StudioState>(initialState);
  const [busy, setBusy] = useState(false);
  const [hookBusy, setHookBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [transformBusy, setTransformBusy] = useState(false);
  const [transformNote, setTransformNote] = useState<string | null>(null);
  // Where the draft sits on the review ladder (raw AI → human edited → … → ready).
  const [reviewStatus, setReviewStatus] = useState<DraftReviewStatus>('raw-ai');

  // A source picked in the Source Inbox pre-fills Compose and restarts the flow.
  useEffect(() => {
    if (!seed) return;
    setBusy(false);
    setError(null);
    setSaved(false);
    setState({
      ...initialState(),
      input: {
        ...emptyInput(),
        title: seed.title,
        material: seed.material,
        sourceId: seed.sourceId,
        ...(seed.channel ? { channel: seed.channel } : {}),
        ...(seed.audience ? { audience: seed.audience } : {}),
        ...(seed.hook ? { hook: seed.hook } : {}),
      },
    });
  }, [seed]);

  const setInput = (patch: Partial<StudioInput>) => setState((s) => ({ ...s, input: { ...s.input, ...patch } }));

  // A manual edit moves a raw AI draft up the ladder to "human edited".
  const setDraft = (draft: string) => {
    setReviewStatus((r) => (r === 'raw-ai' ? 'human-edited' : r));
    setState((s) => ({ ...s, draft }));
  };

  /** Rewrite the draft (clearer / shorter / for patients / …) or translate it. */
  const applyTransform = async (action: RewriteAction | 'translate' | 'apply-voice', language?: StudioLanguage) => {
    if (transformBusy || !state.draft.trim()) return;
    setTransformBusy(true);
    setTransformNote(null);
    setError(null);
    try {
      const result = await transformDraft({
        body: state.draft,
        action,
        language,
        voiceProfileId: state.input.voiceProfileId,
        audience: state.input.audience,
      });
      setState((s) => ({ ...s, draft: result.body }));
      if (result.note) setTransformNote(result.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The rewrite didn’t finish — the draft is unchanged.');
    } finally {
      setTransformBusy(false);
    }
  };

  // Forward performs the stage's async work (compose → review) via the engine,
  // which uses the backend when configured and falls back to the local mirror.
  const forward = async () => {
    if (!canGoForward(state) || busy) return;
    if (state.stage === 'review') {
      setState((s) => ({ ...s, stage: 'ready' }));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (state.stage === 'compose') {
        const draft = await composeStudioDraft(state.input);
        setReviewStatus('raw-ai');
        setTransformNote(null);
        setState((s) => ({ ...s, stage: 'draft', draft }));
      } else if (state.stage === 'draft') {
        const review = await reviewStudioDraft(state.draft, state.input.audience);
        // Passing the automated review advances the ladder; blocks keep it put.
        if (review.cleared) {
          setReviewStatus((r) => (r === 'raw-ai' || r === 'human-edited' ? 'claim-reviewed' : r));
        }
        setState((s) => ({ ...s, stage: 'review', review }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const suggestHook = async () => {
    if (hookBusy) return;
    setHookBusy(true);
    setError(null);
    try {
      setInput({ hook: await suggestStudioHook(state.input) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suggest a hook.');
    } finally {
      setHookBusy(false);
    }
  };

  const back = () => setState((s) => goBack(s));

  const reset = () => {
    setError(null);
    setSaved(false);
    setTransformNote(null);
    setReviewStatus('raw-ai');
    setState(initialState());
  };

  /** Save the reviewed draft to the content calendar as a draft post. */
  const saveToCalendar = () => {
    createThreadFromParts([state.draft], {
      platform: CHANNEL_PLATFORM[state.input.channel],
      scheduledAt: tomorrowMorning(),
      status: 'draft',
      audience: state.input.audience,
    });
    // The source has now been reused — reflect that in the inbox lifecycle.
    if (state.input.sourceId) markSourceUsed(state.input.sourceId);
    setSaved(true);
  };

  const copyDraft = () => void navigator.clipboard?.writeText(state.draft);

  const downloadMarkdown = () => {
    const blob = new Blob([state.draft], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.input.title.trim() || 'draft'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    state,
    busy,
    hookBusy,
    error,
    saved,
    transformBusy,
    transformNote,
    reviewStatus,
    setReviewStatus,
    canBack: canGoBack(state) && !busy,
    canForward: canGoForward(state) && !busy,
    setInput,
    setDraft,
    applyTransform,
    forward,
    suggestHook,
    back,
    reset,
    saveToCalendar,
    copyDraft,
    downloadMarkdown,
  };
}
