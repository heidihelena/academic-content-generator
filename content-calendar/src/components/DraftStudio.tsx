import type { StudioSeed } from '../studio/studioTypes';
import { BookIcon } from './icons';
import { Card, Heading, Text } from './ui';
import {
  ComposeStage,
  DraftStage,
  ReadyStage,
  ReviewStage,
  StudioFooter,
  StudioStepper,
  useDraftStudio,
} from './draft-studio';

/**
 * Draft Studio: the academic writing flow end to end — compose a source, draft,
 * review claims & medical safety, then approve. A presentational shell; the
 * workflow state machine and actions live in `useDraftStudio`, and each stage is
 * its own component.
 */
export function DraftStudio({ seed }: { seed?: StudioSeed | null } = {}) {
  const studio = useDraftStudio(seed);
  const { state, error } = studio;

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

      <StudioStepper stage={state.stage} />

      {state.stage === 'compose' && (
        <ComposeStage
          input={state.input}
          hookBusy={studio.hookBusy}
          onChange={studio.setInput}
          onSuggestHook={studio.suggestHook}
        />
      )}

      {state.stage === 'draft' && (
        <DraftStage
          draft={state.draft}
          audience={state.input.audience}
          channel={state.input.channel}
          voiceProfileId={state.input.voiceProfileId}
          reviewStatus={studio.reviewStatus}
          transformBusy={studio.transformBusy}
          transformNote={studio.transformNote}
          onChange={studio.setDraft}
          onVoiceChange={(voiceProfileId) => studio.setInput({ voiceProfileId })}
          onTransform={(action, language) => void studio.applyTransform(action, language)}
        />
      )}

      {state.stage === 'review' && state.review && <ReviewStage review={state.review} />}

      {state.stage === 'ready' && (
        <ReadyStage
          draft={state.draft}
          saved={studio.saved}
          reviewStatus={studio.reviewStatus}
          onReviewStatus={studio.setReviewStatus}
          onSave={studio.saveToCalendar}
          onCopy={studio.copyDraft}
          onDownload={studio.downloadMarkdown}
          onReset={studio.reset}
        />
      )}

      {error && (
        <p role="alert" data-testid="studio-error" className="text-xs text-status-failed">
          {error}
        </p>
      )}

      {state.stage !== 'ready' && (
        <StudioFooter
          stage={state.stage}
          busy={studio.busy}
          canBack={studio.canBack}
          canForward={studio.canForward}
          onBack={studio.back}
          onForward={studio.forward}
        />
      )}
    </Card>
  );
}
