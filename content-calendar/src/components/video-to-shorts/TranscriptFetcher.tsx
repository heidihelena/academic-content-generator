import { Button, Input, Label } from '../ui';
import { VideoIcon } from '../icons';

interface TranscriptFetcherProps {
  videoUrl: string;
  fetching: boolean;
  fetchOk: number | null;
  fetchError: string | null;
  onUrlChange: (url: string) => void;
  onFetch: () => void;
}

/** The YouTube URL row with a verify-or-redo transcript fetch and its status. */
export function TranscriptFetcher({ videoUrl, fetching, fetchOk, fetchError, onUrlChange, onFetch }: TranscriptFetcherProps) {
  return (
    <div>
      <Label htmlFor="video-url">YouTube URL (optional)</Label>
      <div className="flex gap-2">
        <Input
          id="video-url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={videoUrl}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={!videoUrl.trim()}
          loading={fetching}
          onClick={onFetch}
        >
          {!fetching && <VideoIcon width={14} height={14} />}
          {fetching ? 'Fetching…' : 'Fetch transcript'}
        </Button>
      </div>
      {fetchOk !== null && (
        <p data-testid="fetch-ok" className="mt-1 text-[11px] text-status-published">
          ✓ Verified — fetched {fetchOk} captions. Review below, then plan your shorts.
        </p>
      )}
      {fetchError && (
        <p data-testid="fetch-error" className="mt-1 text-[11px] text-status-brief">
          {fetchError}
        </p>
      )}
    </div>
  );
}
