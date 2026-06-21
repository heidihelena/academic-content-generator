import type { ConnectedAccount, ConnectionStatus } from '../types';
import { useStore } from '../store/useStore';
import { getPlatformMeta } from '../lib/platforms';
import { PLATFORM_GLYPHS, CheckIcon, AlertIcon, PlugIcon } from './icons';
import { Spinner } from './ui/Spinner';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Not connected',
  expired: 'Token expired',
  error: 'Connection error',
};

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color =
    status === 'connected'
      ? 'bg-status-published'
      : status === 'error' || status === 'expired'
      ? 'bg-status-failed'
      : 'bg-status-draft';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function AccountRow({ account }: { account: ConnectedAccount }) {
  const busy = useStore((s) => s.accountBusy[account.platform]);
  const connect = useStore((s) => s.connectAccount);
  const disconnect = useStore((s) => s.disconnectAccount);

  const meta = getPlatformMeta(account.platform);
  const Glyph = PLATFORM_GLYPHS[account.platform];
  const isConnected = account.status === 'connected';
  const isError = account.status === 'error' || account.status === 'expired';

  return (
    <div
      data-testid={`account-${account.platform}`}
      className="flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-850 p-3"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
      >
        <Glyph width={20} height={20} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-200">{meta.name}</p>
          {isConnected && <CheckIcon width={14} height={14} className="text-status-published" />}
          {isError && <AlertIcon width={14} height={14} className="text-status-failed" />}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <StatusDot status={account.status} />
          <span data-testid={`account-status-${account.platform}`}>
            {STATUS_LABEL[account.status]}
          </span>
          {isConnected && account.handle && (
            <span className="truncate"> · {account.handle}</span>
          )}
          {isConnected && account.followers != null && (
            <span className="hidden sm:inline">
              {' '}· {account.followers.toLocaleString()} followers
            </span>
          )}
        </div>
        {isError && account.statusDetail && (
          <p className="mt-0.5 truncate text-[11px] text-status-failed">{account.statusDetail}</p>
        )}
      </div>

      <div className="shrink-0">
        {busy ? (
          <span className="inline-flex items-center px-3">
            <Spinner size={16} />
          </span>
        ) : isConnected ? (
          <button className="btn-secondary py-1.5 text-xs" onClick={() => disconnect(account.platform)}>
            Disconnect
          </button>
        ) : (
          <button className="btn-primary py-1.5 text-xs" onClick={() => connect(account.platform)}>
            {isError ? 'Retry' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  );
}

/** The connected-accounts management panel. */
export function ConnectedAccounts() {
  const accounts = useStore((s) => s.accounts);

  return (
    <section aria-label="Connected accounts" className="card p-4">
      <header className="mb-3 flex items-center gap-2">
        <PlugIcon width={16} height={16} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-slate-200">Connected accounts</h2>
      </header>
      <p className="mb-4 text-xs text-slate-500">
        Connect your social profiles to schedule and publish directly. Uses a mock
        OAuth flow until real platform credentials are configured.
      </p>
      <div className="grid gap-2.5">
        {accounts.map((a) => (
          <AccountRow key={a.platform} account={a} />
        ))}
      </div>
    </section>
  );
}
