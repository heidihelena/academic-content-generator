# Local-First Privacy Model

ForskAI is **local-first and mock-based by default**: nothing leaves your machine
until you opt in by setting configuration. This matters because the source vault
can hold unpublished, embargoed or sensitive research.

Configuration lives in
[`server/src/config/configuration.ts`](../server/src/config/configuration.ts);
every replaceable backend is selected there, so swapping mock → real is a config
change, not a code change.

## Default posture (zero config)

Out of the box:

- **Persistence** is in-memory (`PERSISTENCE_DRIVER=memory`) — data lives only for
  the life of the process. Set a durable driver (`file`/`sqlite`/`neon`) to keep
  manual sources and campaigns across restarts (see below).
- **AI idea generation** uses the **mock generator** (`IDEA_GENERATOR=mock`) — no
  network calls.
- **Draft generation** in the Draft Studio is **local and deterministic** — no LLM call.
- **Safety / citation review** is **rule-based and fully local** — no network calls.
- **Embeddings** use the **mock provider** (`EMBEDDINGS_PROVIDER=mock`).
- **Social platforms** use **mock integrations** — no posts are sent anywhere.

In this mode, **no draft, note or source text is transmitted off the machine.**

## What each opt-in sends, and where

You enable each integration explicitly. Until you set its trigger, that path
stays mock/local.

| Capability | Trigger (env) | What is sent | To whom |
| --- | --- | --- | --- |
| LLM idea generation | `IDEA_GENERATOR=llm` + `ANTHROPIC_API_KEY` | Idea prompts + retrieved vault context | Anthropic API |
| LLM drafting (thread/shorts) | `IDEA_GENERATOR=llm` + `ANTHROPIC_API_KEY` | Abstracts/transcripts you draft from | Anthropic API |
| Embeddings (vector search) | `EMBEDDINGS_PROVIDER=voyage` + `VOYAGE_API_KEY` | Vault chunk text to embed | Voyage AI API |
| Postgres/Neon persistence | `PERSISTENCE_DRIVER=neon` + `DATABASE_URL` | Posts, accounts, vectors | Your configured Postgres |
| SQLite persistence | `PERSISTENCE_DRIVER=sqlite` (+ `SQLITE_PATH`) | Posts, accounts, vectors | Local disk file |
| LinkedIn | `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | OAuth + published posts | LinkedIn |
| Instagram | `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` | OAuth + published posts | Instagram |
| Threads | `THREADS_CLIENT_ID` / `THREADS_CLIENT_SECRET` | OAuth + published posts | Threads |
| Bluesky | `BLUESKY_IDENTIFIER` + `BLUESKY_APP_PASSWORD` | Published posts | Bluesky (AT Protocol) |
| Mastodon | `MASTODON_INSTANCE` + `MASTODON_ACCESS_TOKEN` | Published posts | Your Mastodon instance |
| Media storage (S3) | `STORAGE_DRIVER=s3` + `S3_BUCKET`/`S3_REGION` | Uploaded media | Your S3 bucket |

OAuth tokens and app passwords are persisted **server-side only** and are never
written into the vault.

## Where data is stored, per persistence driver

| `PERSISTENCE_DRIVER` | Location |
| --- | --- |
| `memory` (default) | Process memory only — gone on restart. |
| `sqlite` | A local file at `SQLITE_PATH` (default `./data/content-calendar.sqlite`). |
| `neon` | A Postgres database at `DATABASE_URL`. |

> Note: **manual sources, campaigns and generated content** persist to durable
> JSON files (`SOURCES_STORE_PATH` default `./data/sources.json`,
> `CAMPAIGNS_STORE_PATH` default `./data/campaigns.json`, and
> `CONTENT_ITEMS_STORE_PATH` / `CONTENT_VARIANTS_STORE_PATH` default
> `./data/content-items.json` / `./data/content-variants.json`) whenever
> `PERSISTENCE_DRIVER` is anything other than `memory`; under `memory` they are
> process-only. Native SQL tables are a possible later optimization.

The source vault is read from `VAULT_PATH` (default `./vault`); set
`VAULT_WATCH=true` to watch it for changes.

## Running fully offline

Leave every trigger above unset (the defaults). With `PERSISTENCE_DRIVER=memory`,
the mock generator, mock embeddings and mock integrations, ForskAI makes **no
outbound network calls** and stores nothing off-process.

## Guidance for sensitive material

- For unpublished / embargoed / patient-related material, prefer the **offline
  defaults** and avoid enabling the LLM and embeddings providers.
- If you enable an LLM or embeddings provider, remember that the text you draft
  from (abstracts, notes, vault chunks) is sent to that provider; review their
  data-handling terms.
- Treat `sqlite`/`neon` stores and any S3 bucket as you would any store of
  sensitive data (access control, encryption at rest, backups).
