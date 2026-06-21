# vahtian Content Calendar — Server (NestJS)

Backend for the content calendar: post storage + scheduling, social platform
integrations (mock OAuth/publish), a **markdown/Obsidian vault with vector
search**, and an **AI idea generator** grounded in the vault (RAG).

Built so every external dependency is swappable via config — it boots on a fresh
checkout with **zero native dependencies and no API keys**.

## Architecture at a glance

```
src/
├── config/            typed env config (selects every backend)
├── domain/            shared domain types (Post, Account, AccessToken, VaultChunk…)
├── persistence/       repository interfaces + 3 drivers
│   ├── memory/        in-process default (zero deps)
│   ├── sqlite/        better-sqlite3 (+ sqlite-vec) — single-user / self-hosted
│   └── pg/            Postgres + pgvector — Neon / cloud / serverless
├── integrations/      PlatformIntegration interface + mock + registry
├── posts/             post CRUD + publish (REST)
├── accounts/          connect / disconnect via OAuth + token store
├── scheduler/         @Cron worker that publishes due posts
├── embeddings/        EmbeddingsService: mock (default) | Voyage AI
├── vault/             markdown chunking + incremental ingestion + search
└── ai/                idea generator: mock (default) | Claude (Anthropic SDK)
```

The whole app talks to **interfaces** (`PostsRepository`, `VectorStore`,
`PlatformIntegration`, `EmbeddingsService`, `IdeaGenerator`), so mocks become
real services by changing env vars — never application code.

## Do you need Neon Postgres?

No — pick the persistence driver per deployment:

| `PERSISTENCE_DRIVER` | Operational store | Vectors | Use when |
| --- | --- | --- | --- |
| `memory` (default) | in-process | in-process | first run, tests |
| `sqlite` | better-sqlite3 | sqlite-vec / JS cosine | single-user / self-hosted |
| `neon` | Postgres | pgvector | cloud / serverless / multi-instance |

The **Obsidian vault stays the content source of truth** (markdown, git-versioned).
The database holds only operational state + embeddings. **OAuth tokens live in
the `TokenStore` (DB), never in the vault.**

## Quick start

```bash
cd server
cp .env.example .env        # defaults run fully on mocks, no keys needed
npm install
npm run start:dev           # http://localhost:3000/api
```

`better-sqlite3`, `sqlite-vec` and `pg` are **optional** dependencies — install
them only for the `sqlite` / `neon` drivers.

```bash
npm run build && npm start   # production build + run
npm run typecheck            # type-check only
```

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/posts` | List posts |
| `POST` | `/api/posts` | Create a post |
| `PATCH` | `/api/posts/:id` | Update a post |
| `DELETE` | `/api/posts/:id` | Delete a post |
| `POST` | `/api/posts/:id/publish` | Publish immediately |
| `GET` | `/api/accounts` | Connected-account states |
| `POST` | `/api/accounts/:platform/connect` | Connect (mock OAuth) |
| `POST` | `/api/accounts/:platform/disconnect` | Disconnect |
| `POST` | `/api/vault/ingest` | (Re)index the markdown vault |
| `GET` | `/api/vault/search?q=&k=` | Semantic search |
| `POST` | `/api/ai/ideas` | Generate 5 RAG-grounded ideas |

The scheduler (`@Cron`, every minute) publishes posts whose `scheduledAt` has
arrived via the integration layer.

## Going live (real services)

Every seam is marked in code with `// --- REAL API INTEGRATION POINT ---`:

- **Social platforms** — implement `PlatformIntegration` per platform and
  register it in `integrations/integration.registry.ts` (Instagram Graph API /
  LinkedIn Marketing API / Threads API). Add the OAuth callback route that
  receives the `code` and calls `AccountsService.connect(platform, code)`.
- **Persistence** — set `PERSISTENCE_DRIVER=sqlite` or `neon` (+ `DATABASE_URL`).
  For Neon, `pgvector` is enabled automatically on boot.
- **Embeddings** — set `EMBEDDINGS_PROVIDER=voyage` + `VOYAGE_API_KEY`
  (Anthropic has no first-party embeddings endpoint; Voyage is the recommended
  partner). Keep `EMBEDDING_DIMENSIONS` in sync with the model and the pgvector
  column.
- **AI ideas** — set `IDEA_GENERATOR=llm` + `ANTHROPIC_API_KEY`. Uses
  `@anthropic-ai/sdk` with `claude-opus-4-8`, adaptive thinking, and structured
  outputs.

## Security notes

- OAuth tokens are stored in the `TokenStore` and never returned to clients or
  written to the vault.
- For multi-instance deploys, guard the scheduler's publish step with a
  row/advisory lock so two workers don't double-publish.
