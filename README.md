# ForskAI Content Hub

An academic content operating system for researchers, clinicians and science communicators.

ForskAI turns papers, notes, lectures and research ideas into reviewed, audience-specific content for LinkedIn, Threads, Instagram, newsletters and teaching materials.

It combines:
- a searchable academic source vault
- AI-assisted idea generation
- reusable voice profiles
- claim and citation review
- medical communication safety checks
- campaign planning
- a content calendar
- optional social platform integrations

The default mode is local-first and mock-based. Real platform credentials, LLM providers and vector databases can be enabled by configuration.

> **Why this repo exists.** ForskAI serves three goals at once: (1) building an
> individual expert brand, (2) research-group communication, and (3) safe
> popularization of patient- and public-facing science. See
> [`docs/PRODUCT_DIRECTION.md`](docs/PRODUCT_DIRECTION.md) for the roadmap and
> [Version 1 — private academic writing hub](#version-1--private-academic-writing-hub) below.

## Documentation

| Doc | What it covers |
| --- | --- |
| [`docs/CONTENT_TAXONOMY.md`](docs/CONTENT_TAXONOMY.md) | The controlled vocabulary: source kinds, channels, audiences, content status, safety severities/categories. |
| [`docs/MEDICAL_SAFETY_POLICY.md`](docs/MEDICAL_SAFETY_POLICY.md) | What ForskAI will/won't produce for patient-facing content; the severity model and what blocks export. |
| [`docs/PRIVACY_MODEL.md`](docs/PRIVACY_MODEL.md) | The local-first/mock default and what each opt-in integration sends, and where. |
| [`docs/PRODUCT_DIRECTION.md`](docs/PRODUCT_DIRECTION.md) | Product roadmap and direction. |

## Repository layout

| Path | What it is |
| --- | --- |
| [`content-calendar/`](content-calendar/) | React + TypeScript + Vite dashboard (calendar, editor, analytics, AI). Runs standalone (local mode) or against the API. |
| [`server/`](server/) | NestJS backend: posts + scheduler, OAuth + real platform clients, swappable persistence (memory / SQLite+sqlite-vec / Neon+pgvector), markdown/Obsidian vault vector search, RAG idea generator. |
| [`docker-compose.yml`](docker-compose.yml) | One-command local stack: Postgres+pgvector, the API, and the dashboard. |
| `.github/workflows/` | CI for the frontend and the backend (typecheck · test · build). |

## Quick start

### Option A — full stack with Docker (one command)

```bash
docker compose up --build
```

- Dashboard → http://localhost:8080
- API → http://localhost:3000/api
- Postgres+pgvector with the API on the `neon` driver

Runs entirely on mocks (no API keys). Add real credentials to the `api` service
in `docker-compose.yml` to go live — see
[`server/docs/PLATFORM_SETUP.md`](server/docs/PLATFORM_SETUP.md).

### Option B — frontend only (zero config)

```bash
cd content-calendar && npm install && npm run dev   # http://localhost:5173
```

Sample data + `localStorage`, mock integrations, client-side AI — no backend
needed. See [`content-calendar/README.md`](content-calendar/README.md).

### Option C — frontend + backend, run directly

```bash
cd server && npm install && npm run start:dev       # http://localhost:3000/api
# then, in another terminal:
cd content-calendar && echo "VITE_API_URL=http://localhost:3000/api" > .env.local && npm run dev
```

## Tests

```bash
cd content-calendar && npm test   # 60 tests (Vitest + RTL)
cd server          && npm test    # 37 tests (Jest + supertest)
```

## Going live

Every external service is swappable via config; mocks are the default so nothing
is required to run:

- **Persistence** — `PERSISTENCE_DRIVER=memory|sqlite|neon`
- **Social platforms** — set `*_CLIENT_ID`/`*_CLIENT_SECRET` per platform (real
  Instagram/LinkedIn/Threads clients, mock fallback otherwise)
- **AI ideas** — `IDEA_GENERATOR=llm` + `ANTHROPIC_API_KEY` (Claude)
- **Embeddings** — `EMBEDDINGS_PROVIDER=voyage` + `VOYAGE_API_KEY`

Details in [`server/README.md`](server/README.md) and
[`server/docs/PLATFORM_SETUP.md`](server/docs/PLATFORM_SETUP.md).

## Version 1 — private academic writing hub

The first milestone is a **private, local-first writing hub** — no automatic
publishing, no OAuth setup, no production system yet. The complete workflow:

1. **Import** markdown / Obsidian notes into the source vault
2. **Search** the vault
3. **Pick a source**
4. **Generate 5 content ideas** from it
5. **Choose an audience** (peers · students · patients · general public)
6. **Generate a draft**
7. **Run a claim / safety review** (citation-needed + medical overclaiming)
8. **Save to the calendar**
9. **Export** as markdown or copy-paste into social

Tracked across the GitHub issues tagged `version-1`. Publishing, OAuth, and
real-platform delivery come later — the default mode stays local-first and
mock-based.
