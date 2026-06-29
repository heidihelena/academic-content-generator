import { STUDIO_AUDIENCES, STUDIO_CHANNELS, type StudioInput } from '../../studio/studioTypes';
import { Button, Field, Input, Label, Select, Textarea } from '../ui';

interface ComposeStageProps {
  input: StudioInput;
  hookBusy: boolean;
  onChange: (patch: Partial<StudioInput>) => void;
  onSuggestHook: () => void;
}

/** Stage 1: pick the source, channel, audience and optional hook to draft from. */
export function ComposeStage({ input, hookBusy, onChange, onSuggestHook }: ComposeStageProps) {
  return (
    <div className="space-y-4">
      <Field label="Source title" htmlFor="studio-title">
        <Input
          id="studio-title"
          placeholder="e.g. Street trees and urban heat"
          value={input.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>
      <Field label="Source material (abstract / notes)" htmlFor="studio-material">
        <Textarea
          id="studio-material"
          rows={5}
          placeholder="Paste the abstract or notes to draft from…"
          value={input.material}
          onChange={(e) => onChange({ material: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Channel" htmlFor="studio-channel">
          <Select
            id="studio-channel"
            value={input.channel}
            onChange={(e) => onChange({ channel: e.target.value as StudioInput['channel'] })}
          >
            {STUDIO_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Audience" htmlFor="studio-audience">
          <Select
            id="studio-audience"
            value={input.audience}
            onChange={(e) => onChange({ audience: e.target.value as StudioInput['audience'] })}
          >
            {STUDIO_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="studio-hook">Hook / angle (optional)</Label>
          <Button type="button" variant="ghost" size="sm" onClick={onSuggestHook} disabled={hookBusy || !input.title.trim()}>
            {hookBusy ? 'Suggesting…' : '✦ Suggest hook'}
          </Button>
        </div>
        <Input
          id="studio-hook"
          placeholder="An opening line to steer the draft…"
          value={input.hook}
          onChange={(e) => onChange({ hook: e.target.value })}
        />
      </div>
    </div>
  );
}
