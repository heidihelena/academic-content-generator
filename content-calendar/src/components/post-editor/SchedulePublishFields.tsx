import type { PostStatus } from '../../types';
import { STAGE_ORDER, STAGE_META } from '../../lib/pipeline';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/dateUtils';
import { Input, Label, Select } from '../ui';

const STAGE_OPTIONS: PostStatus[] = [...STAGE_ORDER, 'failed'];

interface SchedulePublishFieldsProps {
  scheduledAt: string;
  status: PostStatus;
  onScheduleChange: (iso: string) => void;
  onStatusChange: (status: PostStatus) => void;
}

/** When the post is scheduled and which pipeline stage it sits in, with the
 *  stage's hint underneath. */
export function SchedulePublishFields({ scheduledAt, status, onScheduleChange, onStatusChange }: SchedulePublishFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="post-when">Schedule</Label>
          <Input
            id="post-when"
            type="datetime-local"
            value={toDateTimeLocalValue(scheduledAt)}
            onChange={(e) => onScheduleChange(fromDateTimeLocalValue(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="post-status">Stage</Label>
          <Select id="post-status" value={status} onChange={(e) => onStatusChange(e.target.value as PostStatus)}>
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STAGE_META[s].label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <p className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        <span className="font-medium text-slate-300">{STAGE_META[status].label}:</span> {STAGE_META[status].hint}
      </p>
    </>
  );
}
