import { Label, Text, Textarea } from '../ui';

interface DraftStageProps {
  draft: string;
  audience: string;
  channel: string;
  onChange: (draft: string) => void;
}

/** Stage 2: the editable generated draft, ready to refine before review. */
export function DraftStage({ draft, audience, channel, onChange }: DraftStageProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="studio-draft">
        Draft for {audience} · {channel}
      </Label>
      <Textarea
        id="studio-draft"
        rows={10}
        data-testid="studio-draft"
        className="font-mono text-xs"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
      />
      <Text variant="muted">Edit freely, then run the review.</Text>
    </div>
  );
}
