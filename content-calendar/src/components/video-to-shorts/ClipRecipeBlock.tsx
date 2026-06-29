import { useState } from 'react';
import { buildClipRecipe } from '../../lib/clipRecipe';
import { Button } from '../ui';

interface ClipRecipeBlockProps {
  startSeconds: number;
  endSeconds: number;
  index: number;
  videoUrl?: string;
}

/** Collapsible copy-paste recipe (yt-dlp + ffmpeg) to render one vertical clip. */
export function ClipRecipeBlock(props: ClipRecipeBlockProps) {
  const [open, setOpen] = useState(false);
  const recipe = buildClipRecipe(props);
  const commands = [recipe.download, recipe.render].filter(Boolean).join('\n');

  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-[11px] text-brand-400 hover:underline"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '▾' : '▸'} Render recipe ({recipe.durationSeconds}s vertical clip)
      </button>
      {open && (
        <div data-testid="clip-recipe" className="mt-1 space-y-1.5">
          {!props.videoUrl && (
            <p className="text-[10px] text-slate-500">Add the video URL above to include the download step.</p>
          )}
          <pre className="overflow-x-auto rounded bg-surface-950 p-2 text-[10px] leading-relaxed text-slate-300">
            {commands}
          </pre>
          <Button type="button" variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(commands)}>
            Copy commands
          </Button>
        </div>
      )}
    </div>
  );
}
