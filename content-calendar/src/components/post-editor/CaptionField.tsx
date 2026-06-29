import type { analyzeReadability, readabilityVerdict } from '../../lib/readability';
import { Callout, Label, Textarea } from '../ui';

interface CaptionFieldProps {
  body: string;
  platformName: string;
  characterLimit: number;
  charCount: number;
  overLimit: boolean;
  readability: ReturnType<typeof analyzeReadability>;
  verdict: ReturnType<typeof readabilityVerdict>;
  onChange: (body: string) => void;
}

/** The main copy field with live character count, over-limit guard, and the
 *  plain-language (readability) check. */
export function CaptionField({
  body,
  platformName,
  characterLimit,
  charCount,
  overLimit,
  readability,
  verdict,
  onChange,
}: CaptionFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor="post-body">Script / Copy</Label>
        <span data-testid="char-count" className={`text-[11px] ${overLimit ? 'text-status-failed' : 'text-slate-500'}`}>
          {charCount} / {characterLimit}
        </span>
      </div>
      <Textarea
        id="post-body"
        rows={6}
        placeholder="Write your caption…"
        value={body}
        onChange={(e) => onChange(e.target.value)}
      />
      {overLimit && (
        <p className="mt-1 text-[11px] text-status-failed">
          Caption exceeds the {platformName} limit by {charCount - characterLimit} characters.
        </p>
      )}

      {verdict.tone !== 'empty' && (
        <Callout data-testid="readability" tone={verdict.tone === 'good' ? 'good' : 'warn'} className="mt-2">
          <span className="font-semibold">Plain-language check · grade {readability.gradeLevel}</span>
          {' — '}
          {verdict.message}
          {readability.complexWords.length > 0 && (
            <span className="mt-1 block text-slate-400">
              Consider simpler words for:{' '}
              <span className="text-slate-300">{readability.complexWords.slice(0, 6).join(', ')}</span>
            </span>
          )}
        </Callout>
      )}
    </div>
  );
}
