/**
 * Bluesky publish verification — a safe end-to-end check that your app password
 * works and that forskai can actually post to your account.
 *
 * It exercises the SAME code path as production (the real `BlueskyIntegration`):
 *   1. createSession  — authenticate with your identifier + app password
 *   2. createRecord   — publish a tiny test post
 *   3. deleteRecord   — remove that test post again (unless --keep)
 *
 * The app password is read from the environment and NEVER printed. Run it on
 * your Mac — the secret stays in your shell, never in chat or a committed file:
 *
 *   cd server
 *   BLUESKY_IDENTIFIER=vahtian.bsky.social \
 *   BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
 *   npm run verify:bluesky
 *
 * Flags:
 *   --auth-only   only verify the credentials (createSession); don't post
 *   --keep        publish the test post but DON'T delete it
 *
 * Create an app password at: Bluesky → Settings → App Passwords (not your login).
 */
import { BlueskyIntegration } from '../src/integrations/bluesky.integration';
import { apiFetch } from '../src/integrations/http';
import type { Post } from '../src/domain/types';

const SERVICE = process.env.BLUESKY_SERVICE ?? 'https://bsky.social';
const IDENTIFIER = process.env.BLUESKY_IDENTIFIER;
const APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

const authOnly = process.argv.includes('--auth-only');
const keep = process.argv.includes('--keep');

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!IDENTIFIER || !APP_PASSWORD) {
    fail(
      'Set BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD in your environment.\n' +
        '  BLUESKY_IDENTIFIER=vahtian.bsky.social BLUESKY_APP_PASSWORD=xxxx npm run verify:bluesky',
    );
  }
  console.log(`forskai · Bluesky verification`);
  console.log(`  service:    ${SERVICE}`);
  console.log(`  identifier: ${IDENTIFIER}`);
  console.log(`  app password: ${'•'.repeat(APP_PASSWORD.length)} (never printed)\n`);

  const bluesky = new BlueskyIntegration(SERVICE, IDENTIFIER, APP_PASSWORD);

  // 1. Authenticate (createSession + profile).
  const { account, token } = await bluesky.connect().catch((e) =>
    fail(`Authentication failed — check the identifier and app password.\n  ${String(e)}`),
  );
  const did = token.accountId!;
  console.log(`✓ Authenticated as ${account.handle}`);
  console.log(`  did: ${did}${account.followers != null ? ` · ${account.followers} followers` : ''}`);

  if (authOnly) {
    console.log('\n✓ Credentials valid (--auth-only: no post made).');
    return;
  }

  // 2. Publish a tiny, clearly-labelled test post via the real publish() path.
  const stamp = new Date().toISOString();
  const post = {
    body: `forskai → Bluesky publish check ✓ ${stamp}${keep ? '' : ' (test — auto-deleted)'}`,
  } as Post;
  const result = await bluesky
    .publish(post, token)
    .catch((e) => fail(`Authenticated, but publishing failed.\n  ${String(e)}`));
  console.log(`\n✓ Published a test post`);
  console.log(`  ${result.permalink}`);

  // 3. Clean up, unless asked to keep it.
  if (keep) {
    console.log('\n✓ Done (--keep: the test post was left on your timeline).');
    return;
  }
  const rkey = result.remoteId.split('/').pop()!;
  await apiFetch('bluesky', `${SERVICE.replace(/\/$/, '')}/xrpc/com.atproto.repo.deleteRecord`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token.accessToken}` },
    body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', rkey }),
  }).catch((e) => {
    console.warn(`\n⚠︎ Published OK but could not auto-delete the test post — delete it manually.\n  ${String(e)}`);
    process.exit(0);
  });
  console.log(`\n✓ Test post deleted — your account is verified end-to-end. 🎉`);
}

main().catch((e) => fail(String(e)));
