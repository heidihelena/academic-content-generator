import { useState } from 'react';
import {
  REWRITE_ACTIONS,
  REWRITE_ACTION_LABELS,
  STUDIO_LANGUAGES,
  STUDIO_LANGUAGE_LABELS,
  type RewriteAction,
  type StudioLanguage,
} from '../../studio/studioTransforms';
import {
  DRAFT_REVIEW_STATUS_LABELS,
  STUDIO_CHANNEL_LABELS,
  type DraftReviewStatus,
  type StudioChannel,
} from '../../studio/studioTypes';
import { useVoiceProfiles } from '../../voices/voicesStore';
import { Badge, Button, Label, Select, Text, Textarea } from '../ui';

interface DraftStageProps {
  draft: string;
  audience: string;
  channel: StudioChannel;
  voiceProfileId?: string;
  reviewStatus: DraftReviewStatus;
  transformBusy: boolean;
  transformNote: string | null;
  onChange: (draft: string) => void;
  onVoiceChange: (voiceProfileId: string | undefined) => void;
  onTransform: (action: RewriteAction | 'translate' | 'apply-voice', language?: StudioLanguage) => void;
}

/**
 * Stage 2: the editable generated draft, with the rewrite toolbar — clearer /
 * shorter / audience-specific rewrites, voice profiles and translation. Every
 * rewrite preserves the claims; the review re-runs afterwards regardless.
 */
export function DraftStage({
  draft,
  audience,
  channel,
  voiceProfileId,
  reviewStatus,
  transformBusy,
  transformNote,
  onChange,
  onVoiceChange,
  onTransform,
}: DraftStageProps) {
  const voices = useVoiceProfiles();
  const [language, setLanguage] = useState<StudioLanguage>('en');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="studio-draft">
          Draft for {audience} · {STUDIO_CHANNEL_LABELS[channel]}
        </Label>
        <Badge size="chip" tone={reviewStatus === 'raw-ai' ? 'warn' : 'info'} data-testid="draft-review-status">
          {DRAFT_REVIEW_STATUS_LABELS[reviewStatus]}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rewrite actions">
        {REWRITE_ACTIONS.map((action) => (
          <Button
            key={action}
            type="button"
            variant="secondary"
            size="sm"
            disabled={transformBusy}
            onClick={() => onTransform(action)}
          >
            {REWRITE_ACTION_LABELS[action]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="studio-voice">Voice profile</Label>
          <Select
            id="studio-voice"
            className="w-52"
            value={voiceProfileId ?? ''}
            onChange={(e) => onVoiceChange(e.target.value || undefined)}
          >
            <option value="">No voice profile</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={transformBusy || !voiceProfileId}
          onClick={() => onTransform('apply-voice')}
        >
          Apply voice
        </Button>
        <div className="ml-auto flex items-end gap-2">
          <div>
            <Label htmlFor="studio-language">Translate to</Label>
            <Select
              id="studio-language"
              className="w-36"
              value={language}
              onChange={(e) => setLanguage(e.target.value as StudioLanguage)}
            >
              {STUDIO_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {STUDIO_LANGUAGE_LABELS[l]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={transformBusy}
            onClick={() => onTransform('translate', language)}
          >
            Translate
          </Button>
        </div>
      </div>

      <Textarea
        id="studio-draft"
        rows={10}
        data-testid="studio-draft"
        className="font-mono text-xs"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        disabled={transformBusy}
      />

      {transformNote && (
        <p role="status" data-testid="transform-note" className="text-xs text-amber-500">
          {transformNote}
        </p>
      )}
      <Text variant="muted">
        {transformBusy ? 'Rewriting…' : 'Rewrites change register and shape, never your claims. Edit freely, then run the review.'}
      </Text>
    </div>
  );
}
