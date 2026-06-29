import { Button } from '../ui';

interface ThreadComposerProps {
  parts: string[];
  platformName: string;
  characterLimit: number;
  onCreate: () => void;
}

/** Shown when the copy is too long for one post: previews the split and offers
 *  to create the multi-part thread. */
export function ThreadComposer({ parts, platformName, characterLimit, onCreate }: ThreadComposerProps) {
  return (
    <div data-testid="thread-composer" className="space-y-2 rounded-lg border border-brand-500/40 bg-brand-500/5 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-200">
          Too long for {platformName} — post as a {parts.length}-part thread
        </span>
        <Button size="sm" onClick={onCreate}>
          Create {parts.length}-part thread
        </Button>
      </div>
      <ol className="space-y-1.5">
        {parts.map((part, i) => (
          <li key={i} className="rounded-md bg-surface-900/60 px-2.5 py-1.5 text-[11px] text-slate-300">
            <span className="whitespace-pre-wrap">{part}</span>
            <span className="mt-0.5 block text-[10px] text-slate-500">
              {part.length}/{characterLimit}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
