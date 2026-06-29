import type { StudioStage } from '../../studio/studioWorkflow';
import { Button } from '../ui';

const FORWARD_LABEL: Record<StudioStage, string> = {
  compose: 'Generate draft →',
  draft: 'Run review →',
  review: 'Approve for publishing →',
  ready: '',
};

interface StudioFooterProps {
  stage: StudioStage;
  busy: boolean;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

/** Back / forward controls. The forward label reflects the current stage. */
export function StudioFooter({ stage, busy, canBack, canForward, onBack, onForward }: StudioFooterProps) {
  return (
    <footer className="flex items-center justify-between border-t border-surface-800 pt-4">
      <Button variant="ghost" onClick={onBack} disabled={!canBack}>
        ← Back
      </Button>
      <Button onClick={onForward} loading={busy} disabled={!canForward}>
        {busy ? 'Working…' : FORWARD_LABEL[stage]}
      </Button>
    </footer>
  );
}
