import { useEffect, useState } from 'react';
import type { StudioChannel, StudioInput, StudioSeed } from '../../studio/studioTypes';
import {
  type StudioState,
  canGoBack,
  canGoForward,
  emptyInput,
  goBack,
  initialState,
} from '../../studio/studioWorkflow';
import { composeStudioDraft, reviewStudioDraft, suggestStudioHook } from '../../studio/studioEngine';
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

  // A source picked in the Source Inbox pre-fills Compose and restarts the flow.
  useEffect(() => {
    if (!seed) return;
    setBusy(false);
    setError(null);
    setSaved(false);
    setState({
      ...initialState(),
      input: { ...emptyInput(), title: seed.title, material: seed.material, sourceId: seed.sourceId },
    });
  }, [seed]);

  const setInput = (patch: Partial<StudioInput>) => setState((s) => ({ ...s, input: { ...s.input, ...patch } }));

  const setDraft = (draft: string) => setState((s) => ({ ...s, draft }));

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
        setState((s) => ({ ...s, stage: 'draft', draft }));
      } else if (state.stage === 'draft') {
        const review = await reviewStudioDraft(state.draft, state.input.audience);
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
    canBack: canGoBack(state) && !busy,
    canForward: canGoForward(state) && !busy,
    setInput,
    setDraft,
    forward,
    suggestHook,
    back,
    reset,
    saveToCalendar,
    copyDraft,
    downloadMarkdown,
  };
}
