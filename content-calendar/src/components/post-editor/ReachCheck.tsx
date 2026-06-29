import type { analyzeReach, reachVerdict } from '../../lib/reach';
import { Callout } from '../ui';

interface ReachCheckProps {
  findings: ReturnType<typeof analyzeReach>;
  reach: ReturnType<typeof reachVerdict>;
}

/** Reach preflight — flags what the platform algorithms quietly demote. */
export function ReachCheck({ findings, reach }: ReachCheckProps) {
  return (
    <Callout data-testid="reach-check" tone={reach.tone === 'good' ? 'good' : 'warn'}>
      <span className="font-semibold">Reach check</span> — {reach.message}
      {findings.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {findings.map((f) => (
            <li key={f.code} className="flex gap-1.5 text-slate-300">
              <span aria-hidden>{f.level === 'warn' ? '⚠' : '·'}</span>
              <span>{f.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Callout>
  );
}
