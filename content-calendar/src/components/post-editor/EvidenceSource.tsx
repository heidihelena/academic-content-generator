import type { PostDraft, Source } from '../../types';
import { EVIDENCE_ORDER, EVIDENCE_META } from '../../lib/evidence';
import { Input, Label, ToggleGroup } from '../ui';
import { BookIcon, AlertIcon } from '../icons';

type EvidenceLevel = PostDraft['evidenceLevel'];

interface EvidenceSourceProps {
  evidenceLevel: EvidenceLevel;
  source: Source | undefined;
  missingSource: boolean;
  onEvidenceChange: (level: EvidenceLevel) => void;
  onSourceLink: (raw: string) => void;
  onSourceField: <K extends keyof Source>(key: K, value: Source[K]) => void;
}

/**
 * The academic spine: what claim is being made and what backs it. Evidence
 * strength (a deselectable toggle) plus the structured source fields, with a
 * warning when a strong claim has no linked source.
 */
export function EvidenceSource({
  evidenceLevel,
  source,
  missingSource,
  onEvidenceChange,
  onSourceLink,
  onSourceField,
}: EvidenceSourceProps) {
  return (
    <div data-testid="evidence-section" className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/40 p-3">
      <div className="flex items-center gap-1.5 text-slate-300">
        <BookIcon width={15} height={15} />
        <span className="text-xs font-semibold">Evidence &amp; source</span>
      </div>

      <div>
        <Label>How strong is the claim?</Label>
        <ToggleGroup
          ariaLabel="Evidence level"
          size="sm"
          deselectable
          value={evidenceLevel ?? null}
          onChange={(v) => onEvidenceChange(v ?? undefined)}
          options={EVIDENCE_ORDER.map((level) => ({
            value: level,
            label: EVIDENCE_META[level].label,
            activeColor: EVIDENCE_META[level].color,
          }))}
        />
        {evidenceLevel && <p className="mt-1 text-[11px] text-slate-500">{EVIDENCE_META[evidenceLevel].description}</p>}
      </div>

      <div>
        <Label htmlFor="source-link">DOI or link</Label>
        <Input
          id="source-link"
          placeholder="10.1038/s41586-… or https://…"
          value={source?.doi ?? source?.url ?? ''}
          onChange={(e) => onSourceLink(e.target.value)}
        />
      </div>

      <Input
        placeholder="Title of the work"
        aria-label="Source title"
        value={source?.title ?? ''}
        onChange={(e) => onSourceField('title', e.target.value || undefined)}
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          className="col-span-2"
          placeholder="Authors"
          aria-label="Source authors"
          value={source?.authors ?? ''}
          onChange={(e) => onSourceField('authors', e.target.value || undefined)}
        />
        <Input
          type="number"
          placeholder="Year"
          aria-label="Source year"
          value={source?.year ?? ''}
          onChange={(e) => onSourceField('year', e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>
      <Input
        placeholder="Venue (journal, conference, repository)"
        aria-label="Source venue"
        value={source?.venue ?? ''}
        onChange={(e) => onSourceField('venue', e.target.value || undefined)}
      />

      {missingSource && evidenceLevel && (
        <p data-testid="missing-source" className="flex items-center gap-1.5 text-[11px] text-status-brief">
          <AlertIcon width={13} height={13} />
          This is marked {EVIDENCE_META[evidenceLevel].label.toLowerCase()} but has no DOI or link.
        </p>
      )}
    </div>
  );
}
