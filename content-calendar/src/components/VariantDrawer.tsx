import { useEffect, useState } from 'react';
import type { ContentItem, ContentVariant, TimingSuggestion } from '../content/contentTypes';
import { exportBlockers } from '../content/contentTypes';
import { contentClient } from '../content/contentClient';
import { Drawer } from './ui/Drawer';
import { CheckIcon, AlertIcon, BookIcon } from './icons';
import { Spinner } from './ui/Spinner';
import { PublishAssistant } from './PublishAssistant';
import { StatusTimeline } from './StatusTimeline';
import { CommentsSection } from './CommentsSection';
import { ChecklistSection } from './ChecklistSection';
import { AssetsSection } from './AssetsSection';

/** Tomorrow 09:00 local — a sensible default schedule slot. */
function tomorrowMorning(): string {
  const at = new Date();
  at.setDate(at.getDate() + 1);
  at.setHours(9, 0, 0, 0);
  return at.toISOString();
}

/** Next future occurrence (UTC) of a given weekday (0–6) + hour. */
function nextOccurrence(weekday: number, hour: number, from: Date = new Date()): string {
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hour, 0, 0, 0),
  );
  let days = (weekday - d.getUTCDay() + 7) % 7;
  if (days === 0 && d.getTime() <= from.getTime()) days = 7;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/**
 * The editor workspace: a right side-drawer (calendar/list/board stay visible)
 * for one ContentVariant. Shows the item's strategy fields, lets you edit the
 * copy, and runs the explicit review gate — Draft → Run review → Findings →
 * Fix → Approve for publishing — so a user can see *why* a text can't ship.
 */
export function VariantDrawer({
  item,
  variant,
  open,
  onClose,
  onChange,
}: {
  item: ContentItem;
  variant: ContentVariant;
  open: boolean;
  onClose: () => void;
  onChange: (v: ContentVariant) => void;
}) {
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

  const dirty =
    body !== variant.body ||
    hook !== (variant.hook ?? '') ||
    hashtags !== variant.hashtags.join(', ');

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

  const blockers = exportBlockers(variant);
  const exportable = blockers.length === 0;

  return (
    <Drawer open={open} title={`${variant.channel} · ${variant.format}`} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{item.title}</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <Field label="Source">{item.sourceIds.join(', ') || '—'}</Field>
            <Field label="Audience">{item.audience}</Field>
            <Field label="Evidence level">{item.evidenceLevel}</Field>
            <Field label="Claim risk">{item.claimRisk}</Field>
            <Field label="Owner">{item.ownerId ?? '—'}</Field>
            <Field label="Campaign">{item.campaignId ?? '—'}</Field>
            <Field label="Status">{variant.status}</Field>
            <Field label="Publishing">{exportable ? 'cleared' : `blocked (${blockers.length})`}</Field>
          </dl>
        </div>

        {/* Copy editing */}
        <div className="space-y-3 border-t border-surface-700 pt-4">
          <div>
            <label htmlFor="v-hook" className="label">Hook</label>
            <input id="v-hook" className="input" value={hook} onChange={(e) => setHook(e.target.value)} />
          </div>
          <div>
            <label htmlFor="v-body" className="label">Body</label>
            <textarea
              id="v-body"
              rows={7}
              className="input resize-none font-mono text-xs"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="v-tags" className="label">Hashtags <span className="font-normal text-slate-500">— comma-separated</span></label>
            <input id="v-tags" className="input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
          </div>
          <button className="btn-secondary py-1.5 text-xs" disabled={!dirty || busy === 'save'} onClick={save}>
            {busy === 'save' ? <Spinner size={12} label="Saving" /> : <BookIcon width={13} height={13} />} Save copy
          </button>
        </div>

        {/* Review gate */}
        <div className="space-y-3 border-t border-surface-700 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Review gate</p>
          <p className="text-[11px] text-slate-500">Draft → run review → fix findings → mark reviewed → approve for publishing.</p>

          <div className="flex flex-wrap gap-1.5">
            <button className="btn-secondary py-1 text-xs" disabled={busy === 'safety'}
              onClick={() => run('safety', () => contentClient.runSafetyReview(variant.id))}>
              Run medical safety review
            </button>
            <button className="btn-secondary py-1 text-xs" disabled={busy === 'citation'}
              onClick={() => run('citation', () => contentClient.runCitationReview(variant.id))}>
              Run citation review
            </button>
          </div>

          <Findings variant={variant} />

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary py-1 text-xs" disabled={!!variant.humanReviewedAt || busy === 'review'}
              onClick={() => run('review', () => contentClient.markReviewed(variant.id))}>
              {variant.humanReviewedAt ? <><CheckIcon width={12} height={12} /> Human-reviewed</> : 'Mark human reviewed'}
            </button>
          </div>
        </div>

        {/* Publishing gate */}
        <div className="space-y-2 border-t border-surface-700 pt-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Approve for publishing</p>
            {exportable ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-status-published"><CheckIcon width={12} height={12} /> cleared</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-status-overdue"><AlertIcon width={12} height={12} /> blocked</span>
            )}
          </div>
          {!exportable && (
            <ul data-testid="export-blockers" className="space-y-1">
              {blockers.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-status-overdue">
                  <AlertIcon width={12} height={12} className="mt-0.5 shrink-0" /> {b}
                </li>
              ))}
            </ul>
          )}
          {suggestions.length > 0 && variant.status !== 'exported' && (
            <div data-testid="timing-suggestions" className="space-y-1">
              <p className="text-[11px] text-slate-500">Best times ({variant.channel} · {item.audience}):</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    data-testid="timing-suggestion"
                    title={`${s.rationale}${s.learnedFrom ? ` · learned from ${s.learnedFrom}` : ''}`}
                    className="rounded-md border border-surface-700 bg-surface-800/60 px-2 py-1 text-[11px] text-slate-300 hover:border-violet-500"
                    disabled={busy === 'schedule'}
                    onClick={() => run('schedule', () => contentClient.schedule(variant.id, nextOccurrence(s.weekday, s.hour)))}
                  >
                    🕑 {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-1.5">
            <button className="btn-secondary py-1 text-xs" disabled={busy === 'schedule' || variant.status === 'exported'}
              onClick={() => run('schedule', () => contentClient.schedule(variant.id, tomorrowMorning()))}>
              Schedule
            </button>
            <button className="btn-primary py-1 text-xs" disabled={!exportable || busy === 'publish' || variant.status === 'exported'}
              title={exportable ? undefined : 'Resolve the blockers above first'}
              onClick={() => run('publish', () => contentClient.publish(variant.id))}>
              {busy === 'publish' ? <Spinner size={12} label="Approving" /> : null}
              {variant.status === 'exported' ? 'Approved' : 'Approve for publishing'}
            </button>
          </div>
        </div>

        {/* Copy the approved text out and record where you posted it — shown
            once the variant is approved for publishing. */}
        {variant.status === 'exported' && <PublishAssistant variant={variant} />}

        {/* Lifecycle history (approval-workflow audit trail). */}
        <StatusTimeline variant={variant} />

        {/* Pre-publish QA checklist on the parent item. */}
        <ChecklistSection itemId={item.id} />

        {/* Media attachments on the parent item. */}
        <AssetsSection itemId={item.id} />

        {/* Collaboration thread on the parent item. */}
        <CommentsSection itemId={item.id} />

        {error && <p className="text-xs text-status-overdue">{error}</p>}
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-300">{children}</dd>
    </>
  );
}

function Findings({ variant }: { variant: ContentVariant }) {
  const safety = variant.safetyReview;
  const citation = variant.citationReview;
  if (!safety && !citation) {
    return <p className="text-[11px] text-slate-500">No reviews run yet.</p>;
  }
  const blocks = safety?.findings.filter((f) => f.severity === 'block') ?? [];
  const warns = safety?.findings.filter((f) => f.severity === 'warn') ?? [];
  const needsCite = citation?.claims.filter((c) => c.needsCitation) ?? [];

  return (
    <div className="space-y-2" data-testid="findings">
      {safety && blocks.length === 0 && warns.length === 0 && (
        <p className="text-[11px] text-status-published">✓ Safety review clean.</p>
      )}
      {blocks.map((f, i) => (
        <p key={`b${i}`} className="text-xs text-status-overdue">⛔ {f.message}</p>
      ))}
      {warns.map((f, i) => (
        <p key={`w${i}`} className="text-xs text-amber-400/90">⚠ {f.message}</p>
      ))}
      {citation && needsCite.length === 0 && (
        <p className="text-[11px] text-status-published">✓ Citations present.</p>
      )}
      {needsCite.map((c, i) => (
        <p key={`c${i}`} className="text-xs text-amber-400/90">“{c.text}” — needs a citation</p>
      ))}
    </div>
  );
}
