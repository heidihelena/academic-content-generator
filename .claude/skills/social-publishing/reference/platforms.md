# Per-platform reference

> Platform APIs change often. Treat the limits below as a starting point and
> re-verify against the live platform docs (and forskai's integration code in
> `server/src/integrations/`) before relying on them for a real publish.

How each platform connects, what its post limits are, and how forskai's
integration handles it.

## Bluesky — `app-password` (AT Protocol)

- **Connect:** the user creates an **app password** (Bluesky → Settings → App
  Passwords — *not* their login password) and enters handle + app password in
  forskai's **Accounts** panel. No OAuth app needed.
- **Limit:** 300 **graphemes** per post. Longer copy must be split into a thread;
  forskai chains parts with AT-Protocol reply refs (root + parent strong refs).
- **Links:** made clickable via richtext **facets** with UTF-8 byte offsets.
- **Media:** images are uploaded as blobs first, then referenced in the post.
- forskai client: `server/src/integrations/bluesky.integration.ts`.

## Mastodon — `access-token` (per instance)

- **Connect:** the user enters their **instance URL** + a personal **access
  token** (Preferences → Development → New application, scopes `read`+`write`) in
  the Accounts panel. Token is per-instance.
- **Limit:** default **500 characters**, but instance-configurable — don't assume.
- **Threads:** chained with `in_reply_to_id` (the immediate parent status id).
- **Media:** uploaded to the media endpoint, then attached by id.
- forskai client: `server/src/integrations/mastodon.integration.ts`.

## LinkedIn — OAuth (`openid profile w_member_social`)

- **Connect:** OAuth redirect (`GET /api/accounts/oauth/linkedin/authorize`).
  Requires a LinkedIn developer app; member-feed posting only with the
  `w_member_social` scope.
- **Limit:** long-form commentary (thousands of chars) — practically generous for
  academic posts; still preview it.
- **Media:** images/orgs need additional scopes/approval — text posts work out of
  the box.
- forskai client: `server/src/integrations/linkedin.integration.ts`
  (`POST /rest/posts`, versioned `LinkedIn-Version` header).

## Instagram — OAuth (Graph, business scopes), two-step

- **Connect:** OAuth; requires an Instagram **Professional** account + a Meta app
  with `instagram_business_basic` + `instagram_business_content_publish` (App
  Review). 
- **Hard requirement:** Instagram feed posts **require an image at a public URL**
  — **text-only is rejected.** Don't attempt a text-only Instagram publish.
- **Two-step publish:** create a media container (`POST /{ig-user-id}/media`) →
  publish it (`POST /{ig-user-id}/media_publish`) → resolve the permalink.
- forskai client: `server/src/integrations/instagram.integration.ts`.

## Threads — OAuth (`threads_basic`, `threads_content_publish`), two-step

- **Connect:** OAuth; Threads Professional account + Meta app.
- **Limit:** ~500 characters; **text-only is allowed** (unlike Instagram); an
  image URL is used when present.
- **Two-step publish:** create container (`media_type=TEXT` or `IMAGE`) → publish.
- forskai client: `server/src/integrations/threads.integration.ts`.

## Quick matrix

| Platform | Connect | Text-only? | Approx limit | Publish shape |
| --- | --- | --- | --- | --- |
| Bluesky | app password | yes | 300 graphemes | createRecord (+ thread refs) |
| Mastodon | access token | yes | ~500 (instance) | status (+ reply id) |
| LinkedIn | OAuth | yes | generous | single feed post |
| Instagram | OAuth | **no — image required** | caption-length | container → publish |
| Threads | OAuth | yes | ~500 | container → publish |
