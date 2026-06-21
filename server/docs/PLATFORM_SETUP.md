# Connecting real social platforms

The server uses **real** Instagram, LinkedIn, and Threads clients when their
OAuth credentials are configured, and falls back to the **mock** per platform
otherwise. You can go live one platform at a time — just add its env vars and
restart.

```
INSTAGRAM_CLIENT_ID=…   INSTAGRAM_CLIENT_SECRET=…
LINKEDIN_CLIENT_ID=…    LINKEDIN_CLIENT_SECRET=…   LINKEDIN_VERSION=202401
THREADS_CLIENT_ID=…     THREADS_CLIENT_SECRET=…
```

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
