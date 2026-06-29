import { Button, Input, Label, Textarea } from '../ui';
import { BookIcon } from '../icons';

interface CopyEditorProps {
  hook: string;
  body: string;
  hashtags: string;
  dirty: boolean;
  saving: boolean;
  onHook: (v: string) => void;
  onBody: (v: string) => void;
  onHashtags: (v: string) => void;
  onSave: () => void;
}

/** Editable hook / body / hashtags with a Save copy action. */
export function CopyEditor({ hook, body, hashtags, dirty, saving, onHook, onBody, onHashtags, onSave }: CopyEditorProps) {
  return (
    <div className="space-y-3 border-t border-surface-700 pt-4">
      <div>
        <Label htmlFor="v-hook">Hook</Label>
        <Input id="v-hook" value={hook} onChange={(e) => onHook(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="v-body">Body</Label>
        <Textarea id="v-body" rows={7} className="font-mono text-xs" value={body} onChange={(e) => onBody(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="v-tags">
          Hashtags <span className="font-normal text-slate-500">— comma-separated</span>
        </Label>
        <Input id="v-tags" value={hashtags} onChange={(e) => onHashtags(e.target.value)} />
      </div>
      <Button variant="secondary" size="sm" disabled={!dirty} loading={saving} onClick={onSave}>
        {!saving && <BookIcon width={13} height={13} />} Save copy
      </Button>
    </div>
  );
}
