import { useState } from 'react';
import type { ConnectedAccount, ConnectionStatus, Platform } from '../types';
import type { PlatformCredentials } from '../lib/dataSource';
import { useStore } from '../store/useStore';
import { getPlatformMeta } from '../lib/platforms';
import { PLATFORM_GLYPHS, CheckIcon, AlertIcon, PlugIcon } from './icons';
import { Spinner } from './ui/Spinner';

/** Platforms that connect with a user-entered credential (not an OAuth redirect). */
const CREDENTIAL_PLATFORMS: Platform[] = ['bluesky', 'mastodon'];

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
  const platform = account.platform;
  const busy = useStore((s) => s.accountBusy[platform]);
  const error = useStore((s) => s.accountError[platform]);
  const connect = useStore((s) => s.connectAccount);
  const verify = useStore((s) => s.verifyAccount);
  const disconnect = useStore((s) => s.disconnectAccount);

  const meta = getPlatformMeta(platform);
  const Glyph = PLATFORM_GLYPHS[platform];
  const isConnected = account.status === 'connected';
  const isError = account.status === 'error' || account.status === 'expired';
  const usesCredentials = CREDENTIAL_PLATFORMS.includes(platform);

  const [formOpen, setFormOpen] = useState(false);
  const [creds, setCreds] = useState<PlatformCredentials>({});

  const set = (patch: Partial<PlatformCredentials>) => setCreds((c) => ({ ...c, ...patch }));

  const onVerify = async () => {
    const ok = await verify(platform, creds);
    if (ok) setFormOpen(false); // verified — collapse; the row flips to Connected
  };

  return (
    <div
      data-testid={`account-${platform}`}
      className="rounded-xl border border-surface-700 bg-surface-850 p-3"
    >
      <div className="flex items-center gap-3">
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
            <span data-testid={`account-status-${platform}`}>{STATUS_LABEL[account.status]}</span>
            {isConnected && account.handle && <span className="truncate"> · {account.handle}</span>}
            {isConnected && account.followers != null && (
              <span className="hidden sm:inline"> · {account.followers.toLocaleString()} followers</span>
            )}
          </div>
          {isError && account.statusDetail && (
            <p className="mt-0.5 truncate text-[11px] text-status-failed">{account.statusDetail}</p>
          )}
          {platform === 'x' && !isConnected && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Requires a paid X developer app (OAuth 2.0, <code>tweet.write</code>).
            </p>
          )}
        </div>

        <div className="shrink-0">
          {busy ? (
            <span className="inline-flex items-center px-3">
              <Spinner size={16} />
            </span>
          ) : isConnected ? (
            <button className="btn-secondary py-1.5 text-xs" onClick={() => disconnect(platform)}>
              Disconnect
            </button>
          ) : usesCredentials ? (
            <button className="btn-primary py-1.5 text-xs" onClick={() => setFormOpen((o) => !o)}>
              {isError ? 'Retry' : 'Connect'}
            </button>
          ) : (
            <button className="btn-primary py-1.5 text-xs" onClick={() => connect(platform)}>
              {isError ? 'Retry' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Credential form (Bluesky / Mastodon): enter → verify → connect, or redo. */}
      {usesCredentials && !isConnected && formOpen && (
        <div className="mt-3 space-y-2 border-t border-surface-700 pt-3">
          {platform === 'bluesky' ? (
            <>
              <input
                className="input text-xs"
                aria-label="Bluesky handle"
                placeholder="you.bsky.social"
                value={creds.identifier ?? ''}
                onChange={(e) => set({ identifier: e.target.value })}
              />
              <input
                className="input text-xs"
                type="password"
                aria-label="Bluesky app password"
                placeholder="app password (Settings → App Passwords)"
                value={creds.appPassword ?? ''}
                onChange={(e) => set({ appPassword: e.target.value })}
              />
            </>
          ) : (
            <>
              <input
                className="input text-xs"
                aria-label="Mastodon instance"
                placeholder="https://fediscience.org"
                value={creds.instance ?? ''}
                onChange={(e) => set({ instance: e.target.value })}
              />
              <input
                className="input text-xs"
                type="password"
                aria-label="Mastodon access token"
                placeholder="access token (Preferences → Development)"
                value={creds.accessToken ?? ''}
                onChange={(e) => set({ accessToken: e.target.value })}
              />
            </>
          )}
          <div className="flex items-center gap-2">
            <button className="btn-primary py-1.5 text-xs" onClick={onVerify} disabled={busy}>
              {busy ? <Spinner size={14} label="Verifying" /> : <CheckIcon width={14} height={14} />}
              {busy ? 'Verifying…' : 'Verify & connect'}
            </button>
            <button className="btn-ghost py-1.5 text-xs" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
          {error && (
            <p data-testid={`verify-error-${platform}`} className="text-[11px] text-status-failed">
              {error} — check your credentials and try again.
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            Your password is verified once and stored securely on this Mac. It's never shown again or sent anywhere else.
          </p>
        </div>
      )}
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
        Connect the accounts you'll post to. Until you connect one, the app runs in
        demo mode and nothing is sent.
      </p>
      <div className="grid gap-2.5">
        {accounts.map((a) => (
          <AccountRow key={a.platform} account={a} />
        ))}
      </div>
    </section>
  );
}
