import { THREAD_AUDIENCES, type ThreadAudience } from '../ai/threadTypes';
import { VideoIcon } from './icons';
import { Button, Card, ErrorState, Field, Heading, Label, Select, Textarea } from './ui';
import { ShortsPlan, TranscriptFetcher, useVideoToShorts } from './video-to-shorts';

const COUNTS = [3, 4, 5, 6];

/**
 * "Video → Shorts plan" — paste a long-form transcript (ideally with the
 * timestamps YouTube provides) and get a plan of short clips. A presentational
 * shell; the inputs, the two async actions, and adding to the calendar live in
 * `useVideoToShorts`.
 */
export function VideoToShorts() {
  const vts = useVideoToShorts();

  return (
    <Card as="section" aria-label="Video to shorts" className="space-y-4 p-4">
      <header className="flex items-center gap-2">
        <VideoIcon width={18} height={18} className="text-brand-400" />
        <div>
          <Heading>Video → Shorts plan</Heading>
          <p className="text-xs text-slate-500">
            Paste a long-form transcript and get a plan of short clips with cut points.
          </p>
        </div>
      </header>

      <TranscriptFetcher
        videoUrl={vts.videoUrl}
        fetching={vts.fetching}
        fetchOk={vts.fetchOk}
        fetchError={vts.fetchError}
        onUrlChange={vts.setVideoUrl}
        onFetch={vts.fetchTranscriptFromUrl}
      />

      <div>
        <Label htmlFor="transcript">
          Transcript <span className="font-normal text-slate-500">— paste with timestamps for real cut points</span>
        </Label>
        <Textarea
          id="transcript"
          rows={7}
          className="font-mono text-[11px]"
          placeholder={'0:00 Welcome back…\n0:42 The key finding is…\n2:15 Here\'s why it matters…'}
          value={vts.transcript}
          onChange={(e) => vts.setTranscript(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="How many shorts" htmlFor="shorts-count">
          <Select id="shorts-count" value={vts.count} onChange={(e) => vts.setCount(Number(e.target.value))}>
            {COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Audience" htmlFor="shorts-audience">
          <Select
            id="shorts-audience"
            value={vts.audience}
            onChange={(e) => vts.setAudience(e.target.value as ThreadAudience)}
          >
            {THREAD_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {a[0].toUpperCase() + a.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Button className="w-full sm:w-auto" onClick={vts.planShorts} loading={vts.planning}>
        {!vts.planning && <VideoIcon width={16} height={16} />}
        {vts.planning ? 'Planning…' : 'Plan shorts'}
      </Button>

      {vts.planError && <ErrorState message={vts.planError} onRetry={vts.planShorts} />}

      {vts.result && !vts.planError && (
        <ShortsPlan
          result={vts.result}
          limit={vts.limit}
          videoUrl={vts.videoUrl || undefined}
          added={vts.added}
          onAdd={vts.addToCalendar}
        />
      )}
    </Card>
  );
}
