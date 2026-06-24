# CLAUDE.md

Guidance for working in this repository.

## What this is

**ForskAI Content Hub** — an academic content operating system that turns
papers, notes and lectures into reviewed, audience-specific content. Two
workspaces:

- **`server/`** — NestJS backend (TypeScript). The academic domain + APIs.
- **`content-calendar/`** — React + TypeScript + Vite dashboard.

See `README.md` for the product overview and `docs/` for the content taxonomy,
medical safety policy and privacy model.

## Core principle: local-first, swap-by-config

Everything works with **zero config** (mocks, in-memory, deterministic) and
upgrades to real services by configuration — never by code change. Don't break
this. Backends are selected by env via factories:

- Persistence: `PERSISTENCE_DRIVER=memory|file|sqlite|neon` (sources & campaigns
  persist to JSON files on any non-`memory` driver: `SOURCES_STORE_PATH`,
  `CAMPAIGNS_STORE_PATH`).
- AI: `IDEA_GENERATOR=llm` + `ANTHROPIC_API_KEY` (Claude, default model
  `claude-opus-4-8`); otherwise deterministic local generators/composers.
- Embeddings: `EMBEDDINGS_PROVIDER=voyage` + `VOYAGE_API_KEY`.
- Obsidian vault: `VAULT_PATH` (default `./vault`).

LLM-backed services (idea generator, draft/hook composers) **fall back to the
local implementation on any error**, so endpoints never fail.

## The academic workflow (server)

`Source Inbox → Idea Lab → Draft Studio → Safety review → (save to calendar)`

- `src/domain/academic.ts` — the schema contract (SourceMaterial, ContentItem +
  ContentVariant, Claim, SafetyFinding, Campaign) as `const` arrays + derived unions.
- `src/sources/` — hybrid Source Inbox: manual sources + live Obsidian vault notes.
- `src/idea-lab/` — 5 ideas from a source (composes the idea generator).
- `src/safety/` — citation-needed + medical-overclaiming reviewers, patient-safe
  escalation. **Read `docs/MEDICAL_SAFETY_POLICY.md` before touching this.**
- `src/draft-studio/` — orchestrates source → draft → review; `DraftComposer`
  (local / Claude).
- `src/campaigns/` — campaign planner.

The frontend mirrors the Draft Studio locally (`src/studio/`) so the flow works
offline; in API mode (`VITE_API_URL`) it calls the backend with local fallback.

## Conventions

- **Repositories**: an interface + injection token + implementations
  (in-memory + file), selected by a `ConfigService` factory in the feature module.
- **Pure utils get colocated specs** (e.g. `markdown.ts` + `markdown.spec.ts`).
- **Tests**: server specs are colocated (`*.spec.ts`, Jest); frontend tests live
  in `content-calendar/tests/` (`*.test.ts(x)`, Vitest + RTL).
- Match surrounding style; keep changes small. Don't rewrite unrelated code.

## Commands

Run per package (`cd server` or `cd content-calendar`):

```bash
npm install          # fresh containers have no node_modules
npm run typecheck
npm run lint
npm test
npm run build
```

Or check both at once from the repo root:

```bash
bash scripts/check.sh
```

In Claude Code on the web, the SessionStart hook (`.claude/hooks/session-start.sh`)
installs both workspaces' deps automatically.

## Git workflow

- Develop on the designated feature branch (e.g. `claude/...`).
- CI is path-scoped: `server/**` and `content-calendar/**` trigger their own
  workflow (typecheck · lint · test · build). A docs-only change runs nothing.
- After a PR merges, the remote branch is deleted; `git fetch --prune` then
  `git merge --ff-only origin/main` to continue on a clean base.
