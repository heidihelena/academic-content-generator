import { useEffect, useState } from 'react';
import {
  STUDIO_AUDIENCES,
  STUDIO_CHANNELS,
  type SafetyFinding,
  type StudioInput,
  type StudioSeed,
} from '../studio/studioTypes';
import {
  STUDIO_STAGES,
  type StudioStage,
  type StudioState,
  canGoBack,
  canGoForward,
  emptyInput,
  goBack,
  initialState,
} from '../studio/studioWorkflow';
import { composeStudioDraft, reviewStudioDraft, suggestStudioHook } from '../studio/studioEngine';
import type { StudioChannel } from '../studio/studioTypes';
import { useStore } from '../store/useStore';
import type { Platform } from '../types';
import { BookIcon } from './icons';
import { Button, Card, Field, Heading, Input, Label, Select, Text, Textarea } from './ui';

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

const STAGE_LABEL: Record<StudioStage, string> = {
  compose: 'Compose',
  draft: 'Draft',
  review: 'Review',
  ready: 'Approve',
};

const FORWARD_LABEL: Record<StudioStage, string> = {
  compose: 'Generate draft →',
  draft: 'Run review →',
  review: 'Approve for publishing →',
  ready: '',
};

const SEVERITY_CLASS: Record<SafetyFinding['severity'], string> = {
  block: 'bg-status-failed/15 text-status-failed',
  warn: 'bg-amber-500/15 text-amber-400',
  info: 'bg-surface-700 text-slate-300',
};

/**
 * Draft Studio: the academic writing flow end to end — compose a source, draft,
 * review claims & medical safety, then approve. The author is the human in the
 * loop: at every stage they can send the work **back** to revise or **forward**,
 * and the Review gate blocks approval until the draft clears safety.
 */
export function DraftStudio({ seed }: { seed?: StudioSeed | null } = {}) {
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
      input: {
        ...emptyInput(),
        title: seed.title,
        material: seed.material,
        sourceId: seed.sourceId,
      },
    });
  }, [seed]);

  const setInput = (patch: Partial<StudioInput>) =>
    setState((s) => ({ ...s, input: { ...s.input, ...patch } }));

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
      const hook = await suggestStudioHook(state.input);
      setInput({ hook });
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

  // Save the reviewed draft to the content calendar as a draft post.
  const saveToCalendar = () => {
    createThreadFromParts([state.draft], {
      platform: CHANNEL_PLATFORM[state.input.channel],
      scheduledAt: tomorrowMorning(),
      status: 'draft',
      audience: state.input.audience,
    });
    setSaved(true);
  };

  const review = state.review;

  const copyDraft = () => {
    void navigator.clipboard?.writeText(state.draft);
  };
  const downloadMarkdown = () => {
    const blob = new Blob([state.draft], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.input.title.trim() || 'draft'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card as="section" aria-label="Draft Studio" className="space-y-5 p-5">
      <header className="flex items-center gap-2">
        <BookIcon width={18} height={18} className="text-brand-400" />
        <div>
          <Heading>Draft Studio</Heading>
          <Text variant="muted">
            Compose → draft → review → approve. Send work back to revise or forward when it&apos;s ready.
          </Text>
        </div>
      </header>

      {/* Stepper */}
      <ol className="flex items-center gap-1 text-xs" aria-label="Workflow stages">
        {STUDIO_STAGES.map((stage, i) => {
          const active = stage === state.stage;
          const done = STUDIO_STAGES.indexOf(state.stage) > i;
          return (
            <li key={stage} className="flex flex-1 items-center gap-1">
              <span
                aria-current={active ? 'step' : undefined}
                data-testid={`stage-${stage}`}
                data-active={active || undefined}
                className={`flex-1 rounded-lg px-2 py-1.5 text-center font-medium ${
                  active
                    ? 'bg-brand-500/15 text-brand-400'
                    : done
                      ? 'bg-surface-800 text-slate-300'
                      : 'bg-surface-800/50 text-slate-500'
                }`}
              >
                {i + 1}. {STAGE_LABEL[stage]}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Stage body */}
      {state.stage === 'compose' && (
        <div className="space-y-4">
          <Field label="Source title" htmlFor="studio-title">
            <Input
              id="studio-title"
              placeholder="e.g. Street trees and urban heat"
              value={state.input.title}
              onChange={(e) => setInput({ title: e.target.value })}
            />
          </Field>
          <Field label="Source material (abstract / notes)" htmlFor="studio-material">
            <Textarea
              id="studio-material"
              rows={5}
              placeholder="Paste the abstract or notes to draft from…"
              value={state.input.material}
              onChange={(e) => setInput({ material: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Channel" htmlFor="studio-channel">
              <Select
                id="studio-channel"
                value={state.input.channel}
                onChange={(e) => setInput({ channel: e.target.value as StudioInput['channel'] })}
              >
                {STUDIO_CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Audience" htmlFor="studio-audience">
              <Select
                id="studio-audience"
                value={state.input.audience}
                onChange={(e) => setInput({ audience: e.target.value as StudioInput['audience'] })}
              >
                {STUDIO_AUDIENCES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="studio-hook">Hook / angle (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={suggestHook}
                disabled={hookBusy || !state.input.title.trim()}
              >
                {hookBusy ? 'Suggesting…' : '✦ Suggest hook'}
              </Button>
            </div>
            <Input
              id="studio-hook"
              placeholder="An opening line to steer the draft…"
              value={state.input.hook}
              onChange={(e) => setInput({ hook: e.target.value })}
            />
          </div>
        </div>
      )}

      {state.stage === 'draft' && (
        <div className="space-y-2">
          <Label htmlFor="studio-draft">
            Draft for {state.input.audience} · {state.input.channel}
          </Label>
          <Textarea
            id="studio-draft"
            rows={10}
            data-testid="studio-draft"
            className="font-mono text-xs"
            value={state.draft}
            onChange={(e) => setState((s) => ({ ...s, draft: e.target.value }))}
          />
          <Text variant="muted">Edit freely, then run the review.</Text>
        </div>
      )}

      {state.stage === 'review' && review && (
        <div className="space-y-4">
          <div
            data-testid="review-status"
            data-cleared={review.cleared || undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              review.cleared
                ? 'bg-status-published/15 text-status-published'
                : 'bg-status-failed/15 text-status-failed'
            }`}
          >
            {review.cleared
              ? 'Cleared — no blocking issues. You can approve it for publishing.'
              : 'Blocked — resolve the issues below, then send back to revise.'}
          </div>

          <div className="space-y-2">
            <p className="label">Safety findings ({review.findings.length})</p>
            {review.findings.length === 0 ? (
              <p className="text-xs text-slate-500">No safety findings.</p>
            ) : (
              <ul className="space-y-1.5" data-testid="findings">
                {review.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-semibold uppercase ${SEVERITY_CLASS[f.severity]}`}>
                      {f.severity}
                    </span>
                    <span className="text-slate-300">
                      <span className="text-slate-500">{f.category}:</span> {f.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <p className="label">Claims needing a citation</p>
            {review.claims.filter((c) => c.needsCitation).length === 0 ? (
              <p className="text-xs text-slate-500">No uncited claims detected.</p>
            ) : (
              <ul className="space-y-1.5" data-testid="claims">
                {review.claims
                  .filter((c) => c.needsCitation)
                  .map((c, i) => (
                    <li key={i} className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-xs text-slate-300">
                      {c.text}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {state.stage === 'ready' && (
        <div className="space-y-3">
          <p data-testid="ready-banner" className="text-sm font-medium text-status-published">
            Approved — ready to publish. Save it to your calendar to schedule or publish.
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-xs text-slate-300">
            {state.draft}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={saveToCalendar} disabled={saved}>
              {saved ? '✓ Saved to calendar' : 'Save to calendar'}
            </Button>
            <Button variant="secondary" size="sm" onClick={copyDraft}>Copy</Button>
            <Button variant="secondary" size="sm" onClick={downloadMarkdown}>Download .md</Button>
            <Button variant="ghost" size="sm" onClick={reset}>Start over</Button>
          </div>
          {saved && (
            <p data-testid="studio-saved" className="text-xs text-status-published">
              Saved as a draft on your content calendar.
            </p>
          )}
        </div>
      )}

      {error && (
        <p data-testid="studio-error" className="text-xs text-status-failed">
          {error}
        </p>
      )}

      {/* Back / Forward controls */}
      {state.stage !== 'ready' && (
        <footer className="flex items-center justify-between border-t border-surface-800 pt-4">
          <Button variant="ghost" onClick={back} disabled={!canGoBack(state) || busy}>
            ← Back
          </Button>
          <Button
            onClick={forward}
            loading={busy}
            disabled={!canGoForward(state) || busy}
          >
            {busy ? 'Working…' : FORWARD_LABEL[state.stage]}
          </Button>
        </footer>
      )}
    </Card>
  );
}
