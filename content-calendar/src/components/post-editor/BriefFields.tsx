import type { PostDraft } from '../../types';
import { Input, Label, Textarea } from '../ui';

interface BriefFieldsProps {
  draft: Pick<PostDraft, 'brief' | 'audience' | 'theme' | 'hook'>;
  onChange: <K extends 'brief' | 'audience' | 'theme' | 'hook'>(key: K, value: PostDraft[K]) => void;
}

/** The framing inputs: why the post exists, who it's for, and the opening line. */
export function BriefFields({ draft, onChange }: BriefFieldsProps) {
  return (
    <>
      <div>
        <Label htmlFor="post-brief">
          Brief <span className="font-normal text-slate-500">— why this post exists</span>
        </Label>
        <Textarea
          id="post-brief"
          rows={2}
          placeholder="Objective / goal for this post…"
          value={draft.brief ?? ''}
          onChange={(e) => onChange('brief', e.target.value || undefined)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="post-audience">Audience</Label>
          <Input
            id="post-audience"
            placeholder="Who is this for?"
            value={draft.audience ?? ''}
            onChange={(e) => onChange('audience', e.target.value || undefined)}
          />
        </div>
        <div>
          <Label htmlFor="post-theme">Theme</Label>
          <Input
            id="post-theme"
            placeholder="Content pillar / topic"
            value={draft.theme ?? ''}
            onChange={(e) => onChange('theme', e.target.value || undefined)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="post-hook">
          Hook <span className="font-normal text-slate-500">— the opening line</span>
        </Label>
        <Input
          id="post-hook"
          placeholder="The scroll-stopping first line…"
          value={draft.hook ?? ''}
          onChange={(e) => onChange('hook', e.target.value || undefined)}
        />
      </div>
    </>
  );
}
