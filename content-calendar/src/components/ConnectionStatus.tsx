import { useEffect, useState } from 'react';
import { checkConnection, type ConnectionStatus as Status } from '../lib/connection';

/**
 * A small badge that verifies the frontend↔backend link. In local mode it shows
 * "Local"; in API mode it probes /api/health on mount and shows "API · connected"
 * (with the active backend modes in the tooltip) or "API · offline" when the
 * backend can't be reached.
 */
export function ConnectionStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let active = true;
    checkConnection().then((s) => {
      if (active) setStatus(s);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!status) return null;

  if (status.mode === 'local') {
    return (
      <Badge color="slate" label="Local" title="Local mode — sample data, no backend (set VITE_API_URL to connect)" />
    );
  }

  if (!status.online) {
    return (
      <Badge
        color="red"
        label="API · offline"
        title={`Backend unreachable at ${status.baseUrl}`}
      />
    );
  }

  const b = status.backend;
  const title = b
    ? `Connected to ${status.baseUrl}\npersistence: ${b.persistence} · ai: ${b.aiGenerator}` +
      (b.aiGenerator === 'llm' ? ` (${b.aiProvider})` : '') +
      ` · embeddings: ${b.embeddings} · storage: ${b.storage}`
    : `Connected to ${status.baseUrl}`;

  return <Badge color="green" label="API · connected" title={title} />;
}

const COLORS = {
  slate: 'bg-surface-800 text-slate-400',
  green: 'bg-emerald-500/15 text-emerald-400',
  red: 'bg-red-500/15 text-red-400',
} as const;

const DOTS = {
  slate: 'bg-slate-500',
  green: 'bg-emerald-400',
  red: 'bg-red-400',
} as const;

function Badge({ color, label, title }: { color: keyof typeof COLORS; label: string; title: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${COLORS[color]}`}
      title={title}
      role="status"
      aria-label={`Connection: ${label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[color]}`} aria-hidden="true" />
      {label}
    </span>
  );
}
