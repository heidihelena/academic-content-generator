# Architecture

A map of how **forskai Content Hub** is put together today. This documents the
*current* state (not a target design); for the strategic direction and a phased
migration plan, see the architecture review.

## Shape

Three workspaces in one repo, each independently built and tested:

| Workspace | Stack | Role |
| --- | --- | --- |
| `server/` | NestJS + TypeScript | Academic domain + REST API |
| `content-calendar/` | React + Vite + Tailwind + Zustand | Dashboard UI |
| `desktop/` | Electron | Packages server + UI into a native local app |

## Core principle: local-first, swap-by-config

Everything runs with **zero config** — deterministic mocks, in-memory stores —
and upgrades to real services purely by environment variables, never by code
change. Each replaceable backend is chosen by a `ConfigService` factory that
returns a mock or a real adapter behind a shared interface. LLM-backed services
**fall back to their local implementation on any error**, so endpoints never
fail.

Already-inverted boundaries (interface + injection token + mock/real impls):
`PostsRepository`, `AccountsRepository`, `TokenStore`, `VectorStore`,
`PlatformIntegration`, `EmbeddingsService`, `LlmClient`, `DraftComposer`,
`TalkComposer`, `CitationVerifier`, `StorageService`, and the durable
`CollectionStore`.

## The academic workflow (server)

```
Source Inbox → Idea Lab → Draft Studio → Safety + Citation review → Content (variants) → Schedule / Export → Publish log
```

- **`src/domain/academic.ts`** — the schema contract as `const` arrays + derived
  unions: `SourceMaterial`, `ContentItem` → `ContentVariant`, `Claim`,
  `SafetyFinding`, `ReviewState`, `Campaign`, plus `PublishLog`, `Comment`,
  `ChecklistItem`, `Asset`, `StatusChange`.
- **`src/sources/`** — hybrid Source Inbox: manual sources + live Obsidian vault notes.
- **`src/idea-lab/`** — 5 ideas from a source (composes the idea generator).
- **`src/draft-studio/`** — orchestrates source → draft → review → persist; a
  `DraftComposer` (local or Claude) writes the copy.
- **`src/safety/`** — three reviewers: medical-overclaiming + citation-*needed*
  (both no-keys heuristics) and the citation-*support* verifier
  (`CITATION_VERIFIER=local|citevahti`). A variant can't export until its
  blocking findings clear and it's marked human-reviewed.
- **`src/content/`** — the `ContentItem`/`ContentVariant` model, the variant
  lifecycle (edit → review → schedule → publish), and the calendar feed.
- Sub-resources hang off an item or variant: `comments/`, `checklist/`,
  `assets/`, `publish-log/`, `status-history/`. Plus `campaigns/`, `timing/`,
  `engagement/`, `vault-export/`, `media/`, `media-gen/`, `render/`, `shorts/`,
  `talk-package/`, `carousel/`, `connections/`, `settings/`, `insights/`.

### Persistence

`createDurableStore` selects the backend by `PERSISTENCE_DRIVER`:
`memory` (default) · `file` (single JSON file, used by the desktop app) ·
`sqlite` (better-sqlite3 + sqlite-vec) · `neon` (Postgres + pgvector). Sources
and campaigns persist to JSON files on any non-`memory` driver. The local-Mac
paths (vault, driver, SQLite path) can also be set from the Connections panel
and saved to `~/forskai/settings.json` (read as a fallback under env vars).

### Auth & owner scoping

A config-gated `AuthGuard` (off by default — local-first). When on
(`AUTH_ENABLED` + `AUTH_TOKEN`/`AUTH_TOKENS`), a `@CurrentUserId()` decorator
resolves each request to an owner id. Content reads are scoped: services call
`getItem`/`getVariant` with the caller's scope, which returns **404 (not 403)**
for another owner's resource — so existence isn't revealed. Sub-resources and
the calendar feed inherit this scoping through their parent item/variant.

## Frontend

The UI depends only on typed client facades, each switching on `VITE_API_URL`:

| Seam | File | Local ↔ API |
| --- | --- | --- |
| Content (items, variants, reviews, campaigns, publish log) | `src/content/contentClient.ts` | `LocalContentClient` ↔ `ApiContentClient` |
| Posts / accounts (calendar) | `src/lib/dataSource.ts` | `LocalDataSource` ↔ `ApiDataSource` |
| Connections snapshot | `src/lib/connections.ts` | all-mock default ↔ `GET /api/connections` |
| Local settings | `src/lib/settings.ts` | API-mode only (`GET/PUT /api/settings`) |

The Draft Studio is mirrored locally (`src/studio/`) so the compose + review
flow works fully offline; in API mode it calls the backend with local fallback.

## Desktop

`desktop/src/main.ts` (Electron main) `fork()`s the bundled NestJS server as a
child process and loads the built frontend, which is compiled to talk to the
server's local origin. Data lives under the per-user app folder
(`app.getPath('userData')`) using the `file` persistence driver — no native
modules, so packaging is portable. CI (`.github/workflows/desktop.yml`) builds
macOS/Windows/Linux installers and publishes them to the `desktop-preview`
release.

## CI

Path-scoped GitHub Actions: `server/**` → **Server CI**, `content-calendar/**` →
**Content Calendar CI** (each runs typecheck · lint · test · build). A
docs-only change to the repo root runs nothing; the desktop build is manual /
tag-triggered.

## Known in-progress migration

Two content models coexist today:

- **Hub model** — `SourceMaterial → ContentItem → ContentVariant → ReviewState →
  PublishLog` (`server/src/content/*`, `content-calendar/src/content/*`). This is
  the strategic model.
- **Calendar model** — the older `Post` + Zustand store
  (`server/src/domain/types.ts`, `content-calendar/src/store/`).

New work targets the hub model; the `Post` path remains until the calendar views
are migrated onto scheduled variants. See the architecture review for the
sequencing (unify the domain, then a plugin/capability contract, then an event
outbox).
