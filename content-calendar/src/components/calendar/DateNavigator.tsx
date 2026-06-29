import { useStore } from '../../store/useStore';
import { formatWeekRange } from '../../lib/dateUtils';
import { addDays, addMonths, formatDayLabel, formatMonthLabel } from '../../lib/calendarViews';
import { ChevronLeft, ChevronRight } from '../icons';
import { Button } from '../ui';

/**
 * Prev / next / today + the current range label. Labels and the range testid
 * adapt to the active view (the week view keeps the "Previous/Next week" labels
 * and the `week-range` testid the calendar relies on).
 */
export function DateNavigator() {
  const view = useStore((s) => s.view);
  const weekAnchor = useStore((s) => s.weekAnchor);
  const goToAnchor = useStore((s) => s.goToAnchor);
  const goToToday = useStore((s) => s.goToToday);
  const anchor = new Date(weekAnchor);

  const step = (dir: -1 | 1) => {
    if (view === 'month') goToAnchor(addMonths(anchor, dir));
    else if (view === 'day') goToAnchor(addDays(anchor, dir));
    else goToAnchor(addDays(anchor, dir * 7));
  };

  const label =
    view === 'month' ? formatMonthLabel(anchor) : view === 'day' ? formatDayLabel(anchor) : formatWeekRange(anchor);
  const unit = view === 'month' ? 'month' : view === 'day' ? 'day' : 'week';
  const testid = view === 'week' ? 'week-range' : 'date-range';

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" className="px-2" aria-label={`Previous ${unit}`} onClick={() => step(-1)}>
        <ChevronLeft />
      </Button>
      <Button variant="secondary" size="sm" className="px-2" aria-label={`Next ${unit}`} onClick={() => step(1)}>
        <ChevronRight />
      </Button>
      <Button variant="ghost" size="sm" onClick={goToToday}>
        Today
      </Button>
      <h2 className="ml-1 text-sm font-semibold text-slate-200" data-testid={testid}>
        {label}
      </h2>
    </div>
  );
}
