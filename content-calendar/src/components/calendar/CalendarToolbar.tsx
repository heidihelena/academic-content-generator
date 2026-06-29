import type { ConflictPair } from '../../lib/conflicts';
import { useStore } from '../../store/useStore';
import { downloadIcs } from '../../lib/ics';
import { ViewSwitcher } from './ViewSwitcher';
import { DateNavigator } from './DateNavigator';
import { SearchBar } from './SearchBar';
import { PlusIcon, AlertIcon, CalendarIcon } from '../icons';
import { Button } from '../ui';

interface Props {
  conflicts: ConflictPair[];
  onShowConflicts: () => void;
}

/** Top control bar: view switcher + date navigator, search, conflict badge, create. */
export function CalendarToolbar({ conflicts, onShowConflicts }: Props) {
  const openEditor = useStore((s) => s.openEditor);
  const filteredPosts = useStore((s) => s.filteredPosts);
  const canCreate = useStore((s) => s.permissions.canCreate);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ViewSwitcher />
        <DateNavigator />
      </div>
      <div className="flex items-center gap-2">
        <SearchBar />
        <Button
          variant="secondary"
          size="sm"
          title="Export the visible posts to your calendar (.ics)"
          onClick={() => downloadIcs(filteredPosts())}
        >
          <CalendarIcon width={14} height={14} /> Export .ics
        </Button>
        {conflicts.length > 0 && (
          <Button variant="danger" size="sm" className="px-2.5" onClick={onShowConflicts}>
            <AlertIcon width={14} height={14} />
            {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
          </Button>
        )}
        {canCreate && (
          <Button onClick={() => openEditor()}>
            <PlusIcon width={16} height={16} /> New post
          </Button>
        )}
      </div>
    </div>
  );
}
