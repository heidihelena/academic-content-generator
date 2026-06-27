---
name: social-publishing
description: Connects social accounts and publishes reviewed, audience-specific academic content to Bluesky, Mastodon, LinkedIn, Instagram, and Threads through the local forskai API. Use when the user wants to connect or verify a social account, preview a content variant for a platform, or publish/record an approved variant. Always runs behind forskai's medical-safety and citation review plus an explicit human-approval step, and never auto-publishes content that has not passed review.
---

# Social publishing

Helps a forskai user take a **reviewed** content variant and get it onto a
social platform — connecting the account, previewing the platform-specific
rendering, getting explicit human sign-off, publishing, and recording the
result. It talks only to the **local forskai API** (`server/`), never directly
to a third-party endpoint, and never to an arbitrary external URL.

forskai's differentiator is that everything is safety- and citation-reviewed
before it reaches an audience. This skill exists to *preserve* that gate, not to
bypass it for convenience.

## The one rule that is never negotiable

**Only publish a variant that has passed review.** A variant is publishable only
when its `safetyReview.cleared === true` (no blocking medical-overclaiming /
citation findings) **and** it has a `humanReviewedAt` timestamp. The server
enforces this (the publish endpoint returns `400` otherwise), but you must also
refuse it yourself: never mark-reviewed or publish on the user's behalf to get
past the gate, and never publish unreviewed or human-unapproved content even if
asked. If a variant isn't cleared, report *why* (its `exportBlockers`) and stop.

## When to use

- "Connect / verify my Bluesky (or Mastodon / LinkedIn / Instagram / Threads) account."
- "Show me how this draft will look on LinkedIn / preview it for Bluesky."
- "Publish this approved variant" / "record that I posted this to Mastodon."

## When NOT to use

- Composing or editing drafts → that's the Draft Studio, not this skill.
- Anything where the variant hasn't been through Safety + citation review.
- Bulk/scheduled auto-posting with no human in the loop — not supported here by design.

## Workflow (follow this exact low-freedom sequence)

This sequence is fixed because publishing is public and irreversible. Do not
improvise around it.

1. **Check the connection.** Run `scripts/forskai.sh connections` to see which
   platforms are connected/configured and whether the backend is reachable. If
   the target platform isn't connected, connect it first (step 1a).
   - **1a. Connect (only if needed).** Bluesky and Mastodon connect with a
     credential the user enters: tell the user to use the app's **Accounts**
     panel (handle + app password for Bluesky; instance + access token for
     Mastodon) — credentials must be entered in the app, **never pasted into
     chat**. LinkedIn / Instagram / Threads use OAuth (`GET /accounts/oauth/:platform/authorize`).
     See `reference/forskai-api.md`.
2. **Select the variant.** Run `scripts/forskai.sh variant <variantId>` (or list
   with `items` / `variants <itemId>`). Confirm with the user which variant and
   which platform.
3. **Gate check.** Confirm `safetyReview.cleared === true` and `humanReviewedAt`
   is set. If not, run `scripts/forskai.sh blockers <variantId>`, report the
   blockers, and stop — do not proceed.
4. **Preview.** Render the variant for the target platform and validate it
   against that platform's limits (length, thread split, media rules) using
   `reference/platforms.md`. Show the exact text (and thread breakdown) that will
   be posted. This is the verifiable intermediate output.
5. **Human approval.** Ask the user to explicitly approve *this exact rendered
   content for this exact account*. Wait for a clear yes. No yes → no publish.
6. **Publish.** Run `scripts/forskai.sh publish <variantId>`. If the server
   rejects it (`400`), surface the reason and return to step 3 — never force it.
7. **Record.** Run `scripts/forskai.sh record <variantId> <publishedUrl>` so the
   publish-log has an auditable entry.

If a step fails, stop and report — do not skip ahead.

## Current capability note (be honest about this)

Today forskai's content-variant publish path is a **manual publish assistant**:
it marks the variant exported and records where it went (the publish-log). Live
auto-posting to a platform exists for the older `Post` model
(`POST /api/posts/:id/publish` via the platform integration) but is not yet
wired for content variants. When previewing/publishing a variant, tell the user
whether the post will be sent automatically or prepared for them to post by hand,
based on what the API returns — don't imply auto-posting that isn't there.

## Capabilities (bundled script)

Run `scripts/forskai.sh <subcommand>` — it calls the local API and prints JSON
for you to read. It needs `FORSKAI_API` (default `http://localhost:3000/api`;
the desktop app serves `http://127.0.0.1:47615/api`) and, if auth is on,
`FORSKAI_TOKEN`.

| Subcommand | What it does |
| --- | --- |
| `connections` | Secret-safe status: providers + which social platforms are connected |
| `accounts` | List connected social accounts |
| `items` | List content items |
| `variants <itemId>` | List the variants under an item |
| `variant <variantId>` | Show one variant (incl. `safetyReview`, `humanReviewedAt`) |
| `blockers <variantId>` | Why a variant can't be exported yet |
| `publish <variantId>` | Publish/export the variant (server enforces the review gate) |
| `record <variantId> <url> [notes]` | Record a manual publish to the publish-log |

## Security

- Tokens and app passwords live **server-side** in forskai's `TokenStore` and
  must never be printed, logged, or pasted into chat.
- This skill has network access and reaches the publish path — treat it as a
  high-trust component. Its scripts call only the local forskai API.

## References (read as needed — one level deep)

- `reference/platforms.md` — per-platform connect method, character limits,
  thread behavior, and media constraints.
- `reference/forskai-api.md` — the exact forskai endpoints this skill uses, with
  `curl` examples.
