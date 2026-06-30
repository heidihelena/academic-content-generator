# Connecting real social platforms

The server uses **real** Bluesky, Mastodon, Instagram, LinkedIn, Threads, and X
clients when their credentials are configured. In API mode, OAuth destinations
do **not** fake a connection when credentials are missing; the Connections button
will fail until the provider app is configured. You can go live one platform at
a time — just add its env vars and restart.

```
FRONTEND_URL=http://localhost:5173
BLUESKY_IDENTIFIER=…    BLUESKY_APP_PASSWORD=…     BLUESKY_SERVICE=https://bsky.social
MASTODON_INSTANCE=…     MASTODON_ACCESS_TOKEN=…
INSTAGRAM_CLIENT_ID=…   INSTAGRAM_CLIENT_SECRET=…
LINKEDIN_CLIENT_ID=…    LINKEDIN_CLIENT_SECRET=…   LINKEDIN_VERSION=202401
THREADS_CLIENT_ID=…     THREADS_CLIENT_SECRET=…
X_CLIENT_ID=…           X_CLIENT_SECRET=…
```

The browser app must run in API mode so the Connections screen can start the
real account flow:

```
VITE_API_URL=http://localhost:3000/api
```

> **Bluesky is the easiest to go live with** — no App Review. Create an **app
> password** (Settings → App Passwords), set `BLUESKY_IDENTIFIER` (your handle or
> email) + `BLUESKY_APP_PASSWORD`, and you can post immediately.

**Redirect/callback URL** (register this exact value in each provider's app):

```
{your public base URL}/api/accounts/oauth/callback
```

The flow: `GET /api/accounts/oauth/:platform/authorize` → send the user to the
returned `authorizeUrl` → the provider redirects back to the callback → the
server exchanges the `code` for tokens and stores them in the `TokenStore`
(never in the vault, never returned to the client).

> The biggest cost here is **not code** — it's each platform's **App Review /
> verification**, which gates the publishing permissions and can take days to
> weeks. Plan for it. A privacy policy, a screencast of the OAuth + publish flow,
> and business verification are typically required.

---

## Bluesky (AT Protocol)

- **Account:** any Bluesky account.
- **Auth:** an **app password** — no OAuth app, no review. Bluesky → Settings →
  Privacy and Security → App Passwords → *Add App Password*.
- **Env:** `BLUESKY_IDENTIFIER` (handle like `you.bsky.social` or your email),
  `BLUESKY_APP_PASSWORD`, optionally `BLUESKY_SERVICE` (defaults to
  `https://bsky.social`; set this for a self-hosted PDS).
- **Publishing:** `com.atproto.server.createSession` for a session, then
  `com.atproto.repo.createRecord` of an `app.bsky.feed.post`. Links in the copy
  are made clickable via richtext **facets** (UTF-8 byte offsets). Posts are
  capped at 300 characters — the in-app thread composer splits longer copy first.
- **Verify end-to-end:** run the verification script on your Mac — it
  authenticates, publishes a tiny test post and deletes it again, using the same
  code path as production. The app password is read from the env and never
  printed, so it stays on your machine:

  ```bash
  cd server
  BLUESKY_IDENTIFIER=vahtian.bsky.social \
  BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
  npm run verify:bluesky
  ```

  Flags: `--auth-only` (check the credentials, post nothing) · `--keep` (leave
  the test post up). A `403 Host not in allowlist` means you're on a network
  that blocks `bsky.social` — run it from your local machine instead.

---

## Mastodon (instance REST API)

- **Account:** any account on any instance.
- **Auth:** a per-account **access token** — Preferences → Development → New
  application (scopes `read` + `write`) → copy the access token. No App Review.
- **Env:** `MASTODON_INSTANCE` (e.g. `https://fediscience.org`) +
  `MASTODON_ACCESS_TOKEN`.
- **Publishing:** `POST /api/v1/statuses` with an `Idempotency-Key` (the post id,
  so scheduler retries never double-post). Threads chain via `in_reply_to_id`.

---

## Instagram (Graph API with Instagram Login)

- **Account:** Instagram **Professional** (Business or Creator).
- **App:** create a Meta app at developers.facebook.com and add the Instagram
  product.
- **Scopes:** `instagram_business_basic`, `instagram_business_content_publish`
  (require **App Review** + business verification for production).
- **Publishing:** two-step (create media container → publish). Feed posts
  **require media at a public URL** — text-only is rejected. Store uploaded media
  somewhere public (S3/Cloudinary) and put the URL on the post's media item.
- **Tokens:** short-lived code → long-lived (~60-day) token. Refresh long-lived
  tokens before expiry (`grant_type=ig_refresh_token`) — add a refresh job.
- **Code:** `src/integrations/instagram.integration.ts`.

## Threads (Threads API)

- **Account:** Threads **Professional** account.
- **App:** Meta app with the Threads use case/product.
- **Scopes:** `threads_basic`, `threads_content_publish`.
- **Publishing:** two-step (create container → publish). Text-only **is**
  supported; an image URL is used when present.
- **Tokens:** short-lived → long-lived (`th_exchange_token`); refresh with
  `th_refresh_token`.
- **Code:** `src/integrations/threads.integration.ts`.

## LinkedIn (Sign In with OpenID Connect + Posts API)

- **App:** create at linkedin.com/developers, request the **Sign In with
  LinkedIn using OpenID Connect** and **Share on LinkedIn** products.
- **Scopes:** `openid`, `profile`, `w_member_social` (member posting). Posting to
  an **organization page** needs `w_organization_social` + the **Community
  Management API** (partner approval) and an admin role.
- **Publishing:** `POST /rest/posts` with `LinkedIn-Version` (set
  `LINKEDIN_VERSION`, e.g. `202401`) and `X-Restli-Protocol-Version: 2.0.0`. The
  created post URN comes back in the `x-restli-id` response header.
- **Media:** this client posts **text only**. Images require the Images API
  (register/upload an image, then reference its URN in the post) — extend
  `publish()` when you need it.
- **Code:** `src/integrations/linkedin.integration.ts`.

---

## X / Twitter (v2 API, OAuth 2.0 PKCE)

> ⚠️ **Requires a PAID X developer app.** Posting needs an app on a **paid access
> tier (Basic or higher)** with **OAuth 2.0** enabled and the **`tweet.write`**
> scope. The free tier is read-limited and **cannot post**. Until configured, X
> remains listed but OAuth will not start.

- **App:** create at developer.x.com, enable **OAuth 2.0** (User authentication
  settings), set the callback to `…/api/accounts/oauth/callback`, and copy the
  **Client ID** + **Client Secret** into `X_CLIENT_ID` / `X_CLIENT_SECRET`.
- **Scopes:** `tweet.read`, `tweet.write`, `users.read`, `offline.access`
  (the last gives a refresh token).
- **Auth:** Authorization Code with **PKCE** (S256). The server generates the
  `code_verifier`/`code_challenge` per OAuth `state` and exchanges the code with
  HTTP Basic auth (`client_id:client_secret`).
- **Publishing:** `POST /2/tweets` with `{ "text": … }` and a Bearer user token;
  280-char default limit. Permalink: `https://x.com/i/web/status/{id}`.
- **Code:** `src/integrations/x.integration.ts`.

---

## Notes

- All clients implement the same `PlatformIntegration` interface
  (`authorizeUrl` / `connect` / `disconnect` / `publish`), selected in
  `src/integrations/integration.registry.ts`. Nothing else in the app references
  concrete clients.
- Token **refresh** is noted but not yet automated — add a scheduled refresh per
  platform (or refresh lazily in `PostsService.publish` when a token is near
  expiry) before relying on long-running scheduled posts.
- Tokens are persisted via the `TokenStore` (memory/SQLite/Neon). Use a durable
  driver in production and keep the database access-controlled.
