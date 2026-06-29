import { useStore } from '../../store/useStore';
import { Input } from '../ui';

/** Free-text search over post captions + platform (drives filterState.searchQuery). */
export function SearchBar() {
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  return (
    <div className="relative">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <Input
        type="search"
        aria-label="Search posts"
        placeholder="Search posts…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-44 py-1.5 pl-8 text-xs sm:w-56"
      />
    </div>
  );
}
