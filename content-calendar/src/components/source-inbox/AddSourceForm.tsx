import { useState } from 'react';
import { SOURCE_KINDS, type SourceKind } from '../../sources/sourcesTypes';
import { Button, Field, Input, Select, Textarea } from '../ui';
import type { NewSourceValues } from './useSourceList';

const EMPTY = { title: '', kind: 'paper' as SourceKind, url: '', abstract: '' };

interface AddSourceFormProps {
  /** Returns true when the source was created; the form then resets and closes. */
  onAdd: (values: NewSourceValues) => Promise<boolean>;
  onDone: () => void;
}

/** The manual "add a paper/link/note" form. Local field state only; persistence
 *  lives in `useSourceList.addSource`. */
export function AddSourceForm({ onAdd, onDone }: AddSourceFormProps) {
  const [form, setForm] = useState(EMPTY);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const ok = await onAdd(form);
    if (ok) {
      setForm(EMPTY);
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/40 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Title" htmlFor="src-title">
          <Input id="src-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Kind" htmlFor="src-kind">
          <Select
            id="src-kind"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as SourceKind })}
          >
            {SOURCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Link / DOI (optional)" htmlFor="src-url">
        <Input id="src-url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      </Field>
      <Field label="Abstract / notes (optional)" htmlFor="src-abstract">
        <Textarea
          id="src-abstract"
          rows={3}
          value={form.abstract}
          onChange={(e) => setForm({ ...form, abstract: e.target.value })}
        />
      </Field>
      <Button type="submit" size="sm" disabled={!form.title.trim()}>
        Add to inbox
      </Button>
    </form>
  );
}
