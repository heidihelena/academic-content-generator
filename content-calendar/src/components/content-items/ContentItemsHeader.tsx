import { Button } from '../ui';
import { SparkleIcon } from '../icons';
import type { ContentView } from './useContentItems';

const VIEWS: ContentView[] = ['list', 'board', 'table'];

interface ContentItemsHeaderProps {
  mode: ContentView;
  onMode: (mode: ContentView) => void;
  onExportCsv: () => void;
  onExportIcs: () => void;
}

/** Title, CSV/ICS export, and the list/board/table view switch. */
export function ContentItemsHeader({ mode, onMode, onExportCsv, onExportIcs }: ContentItemsHeaderProps) {
  return (
    <header className="flex items-center gap-2">
      <SparkleIcon width={20} height={20} className="text-brand-400" />
      <div>
        <h2 className="text-base font-semibold text-slate-200">Content</h2>
        <p className="text-xs text-slate-500">
          One idea, many variants. Click a variant to edit, review and export it in the side panel.
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onExportCsv} title="Export the content plan as a .csv spreadsheet">
          Export .csv
        </Button>
        <Button variant="secondary" size="sm" onClick={onExportIcs} title="Export scheduled content as an .ics calendar">
          Export .ics
        </Button>
        <div className="inline-flex rounded-lg border border-surface-700 p-0.5" role="tablist" aria-label="Content view">
          {VIEWS.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => onMode(m)}
              className={`rounded-md px-2.5 py-1 text-xs capitalize ${
                mode === m ? 'bg-surface-700 text-slate-100' : 'text-slate-400'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
