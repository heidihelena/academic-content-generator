import { Button } from '../ui';

interface ReadyStageProps {
  draft: string;
  saved: boolean;
  onSave: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onReset: () => void;
}

/** Stage 4: the approved draft, with save-to-calendar / copy / download / restart. */
export function ReadyStage({ draft, saved, onSave, onCopy, onDownload, onReset }: ReadyStageProps) {
  return (
    <div className="space-y-3">
      <p data-testid="ready-banner" className="text-sm font-medium text-status-published">
        Approved — ready to publish. Save it to your calendar to schedule or publish.
      </p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-xs text-slate-300">
        {draft}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onSave} disabled={saved}>
          {saved ? '✓ Saved to calendar' : 'Save to calendar'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCopy}>
          Copy
        </Button>
        <Button variant="secondary" size="sm" onClick={onDownload}>
          Download .md
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Start over
        </Button>
      </div>
      {saved && (
        <p data-testid="studio-saved" className="text-xs text-status-published">
          Saved as a draft on your content calendar.
        </p>
      )}
    </div>
  );
}
