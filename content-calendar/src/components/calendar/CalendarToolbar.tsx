import type { ConflictPair } from '../../lib/conflicts';
import { useStore } from '../../store/useStore';
import { ViewSwitcher } from './ViewSwitcher';
import { DateNavigator } from './DateNavigator';
import { SearchBar } from './SearchBar';
import { PlusIcon, AlertIcon } from '../icons';

interface Props {
  conflicts: ConflictPair[];
  onShowConflicts: () => void;
}

/** Top control bar: view switcher + date navigator, search, conflict badge, create. */
export function CalendarToolbar({ conflicts, onShowConflicts }: Props) {
  const openEditor = useStore((s) => s.openEditor);
  const canCreate = useStore((s) => s.permissions.canCreate);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ViewSwitcher />
        <DateNavigator />
      </div>
      <div className="flex items-center gap-2">
        <SearchBar />
        {conflicts.length > 0 && (
          <button
            className="btn bg-status-failed/15 px-2.5 py-1.5 text-xs text-status-failed hover:bg-status-failed/25"
            onClick={onShowConflicts}
          >
            <AlertIcon width={14} height={14} />
            {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
          </button>
        )}
        {canCreate && (
          <button className="btn-primary py-1.5" onClick={() => openEditor()}>
            <PlusIcon width={16} height={16} /> New post
          </button>
        )}
      </div>
    </div>
  );
}
