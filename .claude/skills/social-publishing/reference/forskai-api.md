# forskai API reference (endpoints this skill uses)

All paths are under the API base — `FORSKAI_API` (default
`http://localhost:3000/api`; the desktop app serves `http://127.0.0.1:47615/api`).
If auth is enabled, send `Authorization: Bearer $FORSKAI_TOKEN`.

Prefer the bundled `scripts/forskai.sh` over raw curl; the raw calls are here for
reference and debugging.

## Status & accounts

| Method & path | Purpose |
| --- | --- |
| `GET /connections` | Secret-safe snapshot: providers (live/mock) + social platforms (configured?) |
| `GET /accounts` | Connected social accounts (status, handle) |
| `POST /accounts/:platform/verify` | Connect Bluesky/Mastodon with submitted credentials (done in the app UI) |
| `GET /accounts/oauth/:platform/authorize` | Start the OAuth flow for LinkedIn/Instagram/Threads |
| `POST /accounts/:platform/disconnect` | Disconnect an account |

## Content & review

| Method & path | Purpose |
| --- | --- |
| `GET /content-items` | List content items (scoped to the current user) |
| `GET /content-items/:id/variants` | Variants under an item |
| `GET /content-variants/:id` | One variant — includes `safetyReview`, `citationReview`, `humanReviewedAt`, `status` |
| `POST /content-variants/:id/review/safety` | (Re)run the medical-safety review |
| `POST /content-variants/:id/review/citation` | (Re)run the citation review |
| `POST /content-variants/:id/mark-reviewed` | Human sign-off — sets `humanReviewedAt` (a person must decide this, not the skill) |

## Publish & record

| Method & path | Purpose |
| --- | --- |
| `POST /content-variants/:id/schedule` | Schedule a variant (`{ scheduledAt }`) |
| `POST /content-variants/:id/publish` | Publish/export — **server returns 400 unless safety-cleared AND human-reviewed** |
| `GET /content-variants/:id/publish-log` | Where this variant has been published |
| `POST /content-variants/:id/publish-log` | Record a manual publish (`{ publishedUrl?, notes? }`) |
| `POST /posts/:id/publish` | Older `Post` model: live publish via the platform integration |

## The export gate (mirror of `exportBlockers`)

A variant is publishable only when **both** hold:

1. `safetyReview.cleared === true` — no blocking medical-overclaiming / unresolved
   citation findings.
2. `humanReviewedAt` is set — a human marked it reviewed.

If either is missing, `POST /content-variants/:id/publish` returns `400` with the
reason. The skill must respect that and never work around it.

## curl examples

```bash
# Connection status
curl -s "$FORSKAI_API/connections"

# Inspect a variant (look at safetyReview.cleared + humanReviewedAt)
curl -s "$FORSKAI_API/content-variants/$VID"

# Publish (only after human approval; server enforces the review gate)
curl -s -X POST "$FORSKAI_API/content-variants/$VID/publish"

# Record where it went
curl -s -X POST "$FORSKAI_API/content-variants/$VID/publish-log" \
  -H 'content-type: application/json' \
  -d '{"publishedUrl":"https://bsky.app/profile/.../post/...","notes":"posted by hand"}'
```

With auth on, add `-H "Authorization: Bearer $FORSKAI_TOKEN"` to each call.
