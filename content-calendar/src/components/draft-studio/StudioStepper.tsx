import { STUDIO_STAGES, type StudioStage } from '../../studio/studioWorkflow';

const STAGE_LABEL: Record<StudioStage, string> = {
  compose: 'Compose',
  draft: 'Draft',
  review: 'Review',
  ready: 'Approve',
};

/** The compose → draft → review → approve progress stepper. */
export function StudioStepper({ stage }: { stage: StudioStage }) {
  return (
    <ol className="flex items-center gap-1 text-xs" aria-label="Workflow stages">
      {STUDIO_STAGES.map((s, i) => {
        const active = s === stage;
        const done = STUDIO_STAGES.indexOf(stage) > i;
        return (
          <li key={s} className="flex flex-1 items-center gap-1">
            <span
              aria-current={active ? 'step' : undefined}
              data-testid={`stage-${s}`}
              data-active={active || undefined}
              className={`flex-1 rounded-lg px-2 py-1.5 text-center font-medium ${
                active
                  ? 'bg-brand-500/15 text-brand-strong'
                  : done
                    ? 'bg-surface-800 text-slate-300'
                    : 'bg-surface-800/50 text-slate-500'
              }`}
            >
              {i + 1}. {STAGE_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
