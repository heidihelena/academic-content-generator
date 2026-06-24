import { useState } from 'react';
import {
  STUDIO_AUDIENCES,
  STUDIO_CHANNELS,
  type SafetyFinding,
  type StudioInput,
} from '../studio/studioTypes';
import {
  STUDIO_STAGES,
  type StudioStage,
  type StudioState,
  advance,
  canGoBack,
  canGoForward,
  goBack,
  initialState,
} from '../studio/studioWorkflow';
import { BookIcon } from './icons';

const STAGE_LABEL: Record<StudioStage, string> = {
  compose: 'Compose',
  draft: 'Draft',
  review: 'Review',
  ready: 'Export',
};

const FORWARD_LABEL: Record<StudioStage, string> = {
  compose: 'Generate draft →',
  draft: 'Run review →',
  review: 'Approve & export →',
  ready: '',
};

const SEVERITY_CLASS: Record<SafetyFinding['severity'], string> = {
  block: 'bg-status-failed/15 text-status-failed',
  warn: 'bg-amber-500/15 text-amber-400',
  info: 'bg-surface-700 text-slate-300',
};

/**
 * Draft Studio: the academic writing flow end to end — compose a source, draft,
 * review claims & medical safety, then export. The author is the human in the
 * loop: at every stage they can send the work **back** to revise or **forward**,
 * and the Review gate blocks export until the draft clears safety.
 */
export function DraftStudio() {
  const [state, setState] = useState<StudioState>(initialState);

  const setInput = (patch: Partial<StudioInput>) =>
    setState((s) => ({ ...s, input: { ...s.input, ...patch } }));

  const forward = () => setState((s) => advance(s));
  const back = () => setState((s) => goBack(s));
  const reset = () => setState(initialState());

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
    <section aria-label="Draft Studio" className="card space-y-5 p-5">
      <header className="flex items-center gap-2">
        <BookIcon width={18} height={18} className="text-brand-400" />
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Draft Studio</h2>
          <p className="text-xs text-slate-500">
            Compose → draft → review → export. Send work back to revise or forward when it&apos;s ready.
          </p>
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
          <div>
            <label htmlFor="studio-title" className="label">Source title</label>
            <input
              id="studio-title"
              className="input"
              placeholder="e.g. Street trees and urban heat"
              value={state.input.title}
              onChange={(e) => setInput({ title: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="studio-material" className="label">Source material (abstract / notes)</label>
            <textarea
              id="studio-material"
              rows={5}
              className="input resize-none"
              placeholder="Paste the abstract or notes to draft from…"
              value={state.input.material}
              onChange={(e) => setInput({ material: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="studio-channel" className="label">Channel</label>
              <select
                id="studio-channel"
                className="input"
                value={state.input.channel}
                onChange={(e) => setInput({ channel: e.target.value as StudioInput['channel'] })}
              >
                {STUDIO_CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="studio-audience" className="label">Audience</label>
              <select
                id="studio-audience"
                className="input"
                value={state.input.audience}
                onChange={(e) => setInput({ audience: e.target.value as StudioInput['audience'] })}
              >
                {STUDIO_AUDIENCES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="studio-hook" className="label">Hook / angle (optional)</label>
            <input
              id="studio-hook"
              className="input"
              placeholder="An opening line to steer the draft…"
              value={state.input.hook}
              onChange={(e) => setInput({ hook: e.target.value })}
            />
          </div>
        </div>
      )}

      {state.stage === 'draft' && (
        <div className="space-y-2">
          <label htmlFor="studio-draft" className="label">
            Draft for {state.input.audience} · {state.input.channel}
          </label>
          <textarea
            id="studio-draft"
            rows={10}
            data-testid="studio-draft"
            className="input resize-none font-mono text-xs"
            value={state.draft}
            onChange={(e) => setState((s) => ({ ...s, draft: e.target.value }))}
          />
          <p className="text-xs text-slate-500">Edit freely, then run the review.</p>
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
              ? 'Cleared — no blocking issues. You can export.'
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
            Approved. Export your content.
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-xs text-slate-300">
            {state.draft}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary py-1.5 text-xs" onClick={copyDraft}>Copy</button>
            <button className="btn-secondary py-1.5 text-xs" onClick={downloadMarkdown}>Download .md</button>
            <button className="btn-ghost py-1.5 text-xs" onClick={reset}>Start over</button>
          </div>
        </div>
      )}

      {/* Back / Forward controls */}
      {state.stage !== 'ready' && (
        <footer className="flex items-center justify-between border-t border-surface-800 pt-4">
          <button className="btn-ghost" onClick={back} disabled={!canGoBack(state)}>
            ← Back
          </button>
          <button className="btn-primary" onClick={forward} disabled={!canGoForward(state)}>
            {FORWARD_LABEL[state.stage]}
          </button>
        </footer>
      )}
    </section>
  );
}
