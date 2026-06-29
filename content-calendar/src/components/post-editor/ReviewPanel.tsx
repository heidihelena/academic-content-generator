import type { PostDraft, Source } from '../../types';
import { EVIDENCE_META, hasSourceLink, sourceLabel } from '../../lib/evidence';
import { Button, Input, Label, Textarea } from '../ui';
import { AlertIcon, CheckIcon } from '../icons';

interface ReviewPanelProps {
  reviewer: string | undefined;
  evidenceLevel: PostDraft['evidenceLevel'];
  source: Source | undefined;
  missingSource: boolean;
  people: string[];
  showNote: boolean;
  changeNote: string;
  onReviewerChange: (reviewer: string | undefined) => void;
  onChangeNote: (note: string) => void;
  onShowNote: (show: boolean) => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}

/** The review gate, shown only while a post is in Review: assign a reviewer,
 *  verify the evidence, then approve or send back with a note. */
export function ReviewPanel({
  reviewer,
  evidenceLevel,
  source,
  missingSource,
  people,
  showNote,
  changeNote,
  onReviewerChange,
  onChangeNote,
  onShowNote,
  onApprove,
  onRequestChanges,
}: ReviewPanelProps) {
  return (
    <div data-testid="review-panel" className="space-y-3 rounded-lg border border-status-review/40 bg-status-review/5 p-3">
      <div>
        <Label htmlFor="post-reviewer">Reviewer</Label>
        <Input
          id="post-reviewer"
          list="reviewer-suggestions"
          placeholder="Assign a reviewer…"
          value={reviewer ?? ''}
          onChange={(e) => onReviewerChange(e.target.value || undefined)}
        />
        <datalist id="reviewer-suggestions">
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      {/* Accuracy check: show the evidence level + source to verify. */}
      <div className="rounded-md bg-surface-900/60 px-2.5 py-2 text-[11px]">
        {evidenceLevel ? (
          <p>
            <span className="font-semibold" style={{ color: EVIDENCE_META[evidenceLevel].color }}>
              {EVIDENCE_META[evidenceLevel].label}
            </span>
            {hasSourceLink(source) || source?.title ? (
              <span className="text-slate-400"> · {sourceLabel(source)}</span>
            ) : null}
          </p>
        ) : (
          <p className="text-slate-500">No evidence level set.</p>
        )}
        {missingSource && (
          <p className="mt-1 flex items-center gap-1.5 text-status-brief">
            <AlertIcon width={12} height={12} /> Verify accuracy — no source is linked.
          </p>
        )}
      </div>

      {showNote ? (
        <div className="space-y-2">
          <Label htmlFor="change-note">What needs to change?</Label>
          <Textarea
            id="change-note"
            rows={3}
            placeholder="Describe the changes needed…"
            value={changeNote}
            onChange={(e) => onChangeNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={!changeNote.trim()} onClick={onRequestChanges}>
              Send back to Drafting
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onShowNote(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={onApprove}>
            <CheckIcon width={14} height={14} /> Approve
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onShowNote(true)}>
            Request changes
          </Button>
        </div>
      )}
    </div>
  );
}
