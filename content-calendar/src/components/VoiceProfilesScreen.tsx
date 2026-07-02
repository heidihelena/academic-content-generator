import { useState } from 'react';
import {
  VOICE_FORMALITIES,
  VOICE_LANGUAGES,
  VOICE_LANGUAGE_LABELS,
  VOICE_LENGTHS,
  type VoiceProfile,
  type VoiceProfileInput,
} from '../voices/voiceTypes';
import {
  createVoiceProfile,
  deleteVoiceProfile,
  restoreSeedVoiceProfiles,
  updateVoiceProfile,
  useVoiceProfiles,
} from '../voices/voicesStore';
import { UserIcon, PlusIcon } from './icons';
import { Badge, Button, Card, Field, Heading, Input, Select, Text, Textarea } from './ui';

/**
 * Voice Profiles — reusable writing voices for the Draft Studio. Everything
 * here stays on this computer (localStorage); a profile only reaches an LLM
 * provider if you apply it to a draft while a provider is configured.
 */

function emptyProfile(): VoiceProfileInput {
  return {
    name: '',
    tone: '',
    audience: '',
    language: 'en',
    formality: 'balanced',
    preferredLength: 'medium',
    wordsToAvoid: [],
    styleExamples: [],
  };
}

function toLines(items: string[]): string {
  return items.join('\n');
}

function fromLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function ProfileForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: VoiceProfileInput;
  onSave: (values: VoiceProfileInput) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const set = (patch: Partial<VoiceProfileInput>) => setValues((v) => ({ ...v, ...patch }));

  return (
    <form
      className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (values.name.trim()) onSave({ ...values, name: values.name.trim() });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="voice-name">
          <Input
            id="voice-name"
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Conference recap voice"
            required
          />
        </Field>
        <Field label="Audience" htmlFor="voice-audience">
          <Input
            id="voice-audience"
            value={values.audience}
            onChange={(e) => set({ audience: e.target.value })}
            placeholder="Who this voice speaks to"
          />
        </Field>
      </div>
      <Field label="Tone" htmlFor="voice-tone">
        <Input
          id="voice-tone"
          value={values.tone}
          onChange={(e) => set({ tone: e.target.value })}
          placeholder="e.g. measured, evidence-first, warm"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Language" htmlFor="voice-language">
          <Select
            id="voice-language"
            value={values.language}
            onChange={(e) => set({ language: e.target.value as VoiceProfileInput['language'] })}
          >
            {VOICE_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {VOICE_LANGUAGE_LABELS[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Formality" htmlFor="voice-formality">
          <Select
            id="voice-formality"
            value={values.formality}
            onChange={(e) => set({ formality: e.target.value as VoiceProfileInput['formality'] })}
          >
            {VOICE_FORMALITIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Preferred length" htmlFor="voice-length">
          <Select
            id="voice-length"
            value={values.preferredLength}
            onChange={(e) => set({ preferredLength: e.target.value as VoiceProfileInput['preferredLength'] })}
          >
            {VOICE_LENGTHS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Words to avoid (one per line)" htmlFor="voice-avoid">
          <Textarea
            id="voice-avoid"
            rows={3}
            value={toLines(values.wordsToAvoid)}
            onChange={(e) => set({ wordsToAvoid: fromLines(e.target.value) })}
          />
        </Field>
        <Field label="Style examples (one per line)" htmlFor="voice-examples">
          <Textarea
            id="voice-examples"
            rows={3}
            value={toLines(values.styleExamples)}
            onChange={(e) => set({ styleExamples: fromLines(e.target.value) })}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Save voice
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ProfileCard({ profile, onEdit, onDelete }: { profile: VoiceProfile; onEdit: () => void; onDelete: () => void }) {
  return (
    <li className="space-y-2 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5" data-testid="voice-profile">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-slate-200">{profile.name}</span>
            <Badge size="chip">{VOICE_LANGUAGE_LABELS[profile.language]}</Badge>
            <Badge size="chip">{profile.formality}</Badge>
            <Badge size="chip">{profile.preferredLength}</Badge>
          </div>
          {profile.tone && <p className="mt-1 text-xs text-slate-400">{profile.tone}</p>}
          {profile.audience && <p className="mt-0.5 text-[11px] text-slate-500">For: {profile.audience}</p>}
          {profile.wordsToAvoid.length > 0 && (
            <p className="mt-0.5 text-[11px] text-slate-500">Avoids: {profile.wordsToAvoid.join(', ')}</p>
          )}
          {profile.styleExamples.length > 0 && (
            <p className="mt-1 border-l-2 border-surface-600 pl-2 text-[11px] italic text-slate-500">
              “{profile.styleExamples[0]}”
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete ${profile.name}`}>
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}

export function VoiceProfilesScreen() {
  const profiles = useVoiceProfiles();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Card as="section" aria-label="Voice Profiles" className="space-y-4 p-5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserIcon width={18} height={18} className="text-brand-400" />
          <div>
            <Heading>Voice Profiles</Heading>
            <Text variant="muted">
              Reusable voices for your drafts — tone, audience, language and the words you never use. Stays on this computer.
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={restoreSeedVoiceProfiles}>
            Restore starter voices
          </Button>
          <Button size="sm" onClick={() => setCreating((v) => !v)} aria-expanded={creating}>
            <PlusIcon width={14} height={14} /> New voice
          </Button>
        </div>
      </header>

      {creating && (
        <ProfileForm
          initial={emptyProfile()}
          onSave={(values) => {
            createVoiceProfile(values);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {profiles.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No voice profiles yet. Create one, or restore the six starter voices.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="voice-profile-list">
          {profiles.map((p) =>
            editingId === p.id ? (
              <li key={p.id}>
                <ProfileForm
                  initial={p}
                  onSave={(values) => {
                    updateVoiceProfile(p.id, values);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <ProfileCard key={p.id} profile={p} onEdit={() => setEditingId(p.id)} onDelete={() => deleteVoiceProfile(p.id)} />
            ),
          )}
        </ul>
      )}
    </Card>
  );
}
