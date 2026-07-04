import { useEffect, useState } from 'react';
import type { ConnectedAccount, ConnectionStatus, Platform } from '../types';
import type { PlatformCredentials } from '../lib/dataSource';
import { useStore } from '../store/useStore';
import { isApiMode } from '../lib/connection';
import { getPlatformMeta } from '../lib/platforms';
import {
  fetchProviderCredentialStatus,
  saveProviderCredentials,
} from '../lib/providerCredentials';
import { PLATFORM_GLYPHS, CheckIcon, AlertIcon, PlugIcon } from './icons';
import { Button, Card, ConfirmDialog, Heading, Input, Spinner, Text } from './ui';

/** Platforms that connect with a user-entered credential (not an OAuth redirect). */
const CREDENTIAL_PLATFORMS: Platform[] = ['bluesky', 'mastodon'];

/** OAuth platforms whose developer-app credentials can be entered in the app.
 *  Instagram and Threads take a Meta (Facebook) developer app's ID/Secret. */
const OAUTH_APP_PLATFORMS: Platform[] = ['linkedin', 'x', 'instagram', 'threads', 'youtube'];

/** What to call the developer app whose credentials a platform needs. */
const APP_CREDS_SOURCE: Partial<Record<Platform, string>> = {
  linkedin: "your LinkedIn developer app's Client ID & Secret (Auth tab)",
  x: "your paid X developer app's OAuth 2.0 Client ID & Secret",
  instagram: "your Meta (Facebook) developer app's App ID & Secret",
  threads: "your Meta (Facebook) developer app's App ID & Secret",
  youtube: "your Google Cloud OAuth client's ID & Secret (YouTube Data API v3 enabled)",
};

/**
 * One-time developer-app credentials (Client ID/Secret) for an OAuth platform.
 * Saved to the local backend, stored encrypted on this Mac, never shown again —
 * this is what lets the desktop app go live without editing server/.env.
 */
function AppCredentialsSection({
  platform,
  configured,
  onSaved,
}: {
  platform: Platform;
  configured: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProviderCredentials(platform, { clientId, clientSecret });
      setClientId('');
      setClientSecret('');
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the app credentials.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-surface-700 pt-3" data-testid={`app-creds-${platform}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          {configured
            ? 'App credentials saved on this Mac — Connect can start.'
            : `Needs ${APP_CREDS_SOURCE[platform] ?? "your developer app's Client ID & Secret"}.`}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {configured ? 'Update app credentials' : 'Add app credentials'}
        </Button>
      </div>
      {open && (
        <div className="space-y-2">
          <Input
            className="text-xs"
            aria-label={`${getPlatformMeta(platform).name} client ID`}
            placeholder="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <Input
            className="text-xs"
            type="password"
            aria-label={`${getPlatformMeta(platform).name} client secret`}
            placeholder="Client Secret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={!clientId.trim() || !clientSecret.trim()} loading={saving} onClick={save}>
              Save credentials
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-[11px] text-status-failed">
              {error}
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            Stored encrypted on this Mac and never shown again. Saved once — then Connect opens the
            {` ${getPlatformMeta(platform).name} `}consent screen.
          </p>
        </div>
      )}
    </div>
  );
}

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

function AccountRow({
  account,
  appCredsConfigured = false,
  onAppCredsSaved,
}: {
  account: ConnectedAccount;
  appCredsConfigured?: boolean;
  onAppCredsSaved?: () => void;
}) {
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
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
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
            <Button variant="secondary" size="sm" onClick={() => setConfirmDisconnect(true)}>
              Disconnect
            </Button>
          ) : usesCredentials ? (
            <Button size="sm" onClick={() => setFormOpen((o) => !o)}>
              {isError ? 'Retry' : 'Connect'}
            </Button>
          ) : (
            <Button size="sm" onClick={() => connect(platform)}>
              {isError ? 'Retry' : 'Connect'}
            </Button>
          )}
        </div>
      </div>

      {/* Developer-app credentials (LinkedIn / X): saved once, then OAuth can start. */}
      {OAUTH_APP_PLATFORMS.includes(platform) && !isConnected && isApiMode() && (
        <AppCredentialsSection
          platform={platform}
          configured={appCredsConfigured}
          onSaved={() => onAppCredsSaved?.()}
        />
      )}

      {/* Credential form (Bluesky / Mastodon): enter → verify → connect, or redo. */}
      {usesCredentials && !isConnected && formOpen && (
        <div className="mt-3 space-y-2 border-t border-surface-700 pt-3">
          {platform === 'bluesky' ? (
            <>
              <Input
                className="text-xs"
                aria-label="Bluesky handle"
                placeholder="you.bsky.social"
                value={creds.identifier ?? ''}
                onChange={(e) => set({ identifier: e.target.value })}
              />
              <Input
                className="text-xs"
                type="password"
                aria-label="Bluesky app password"
                placeholder="app password (Settings → App Passwords)"
                value={creds.appPassword ?? ''}
                onChange={(e) => set({ appPassword: e.target.value })}
              />
            </>
          ) : (
            <>
              <Input
                className="text-xs"
                aria-label="Mastodon instance"
                placeholder="https://fediscience.org"
                value={creds.instance ?? ''}
                onChange={(e) => set({ instance: e.target.value })}
              />
              <Input
                className="text-xs"
                type="password"
                aria-label="Mastodon access token"
                placeholder="access token (Preferences → Development)"
                value={creds.accessToken ?? ''}
                onChange={(e) => set({ accessToken: e.target.value })}
              />
            </>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onVerify} loading={busy}>
              {!busy && <CheckIcon width={14} height={14} />}
              {busy ? 'Verifying…' : 'Verify & connect'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
          {error && (
            <p role="alert" data-testid={`verify-error-${platform}`} className="text-[11px] text-status-failed">
              {error} — check your credentials and try again.
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            Your password is verified once and stored securely on this Mac. It's never shown again or sent anywhere else.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmDisconnect}
        title={`Disconnect ${meta.name}?`}
        message={`You'll need to re-enter your ${account.handle ?? meta.name} credentials to reconnect.`}
        confirmLabel="Disconnect"
        danger
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => {
          setConfirmDisconnect(false);
          void disconnect(platform);
        }}
      />
    </div>
  );
}

/** The connected-accounts management panel. */
export function ConnectedAccounts() {
  const accounts = useStore((s) => s.accounts);
  const apiMode = isApiMode();

  // Which OAuth platforms already have app credentials saved (booleans only).
  const [credStatus, setCredStatus] = useState<Partial<Record<string, boolean>>>({});
  const refreshCredStatus = () => {
    void fetchProviderCredentialStatus()
      .then(setCredStatus)
      .catch(() => setCredStatus({}));
  };
  useEffect(() => {
    if (apiMode) refreshCredStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMode]);

  return (
    <Card as="section" aria-label="Connected accounts" className="p-4">
      <header className="mb-3 flex items-center gap-2">
        <PlugIcon width={16} height={16} className="text-brand-400" />
        <Heading>Connected accounts</Heading>
      </header>
      <Text variant="muted" className="mb-4">
        {apiMode
          ? "Connect the real accounts you'll post to. Publishing uses the stored provider tokens."
          : 'Demo mode: start the backend and set VITE_API_URL to connect real accounts.'}
      </Text>
      <div className="grid gap-2.5">
        {accounts.map((a) => (
          <AccountRow
            key={a.platform}
            account={a}
            appCredsConfigured={Boolean(credStatus[a.platform])}
            onAppCredsSaved={refreshCredStatus}
          />
        ))}
      </div>
    </Card>
  );
}
