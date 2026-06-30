# forskai · Content Hub (dashboard)

The React dashboard for **forskai Content Hub** — an academic content operating
system that turns papers, notes and lectures into reviewed, audience-specific
content. This is the frontend; the academic domain and APIs live in [`../server`](../server).

> Built with React + TypeScript + Vite + Tailwind + Zustand, and tested with
> Vitest + React Testing Library. **Local-first:** it runs end-to-end with
> sample data and no backend, and upgrades to the live API by one env var.

---

## The workflow

The hub mirrors the backend's academic pipeline:

```
Source Inbox → Idea Lab → Draft Studio → Safety + Citation review → Content (variants) → Schedule / Export
```

| View | What it does |
| --- | --- |
| **Source Inbox** | Manual sources + live Obsidian vault notes — the input material |
| **Generate Ideas** | 5 audience-specific ideas from a source; abstract→thread, talk packages, video→shorts |
| **Draft Studio** | Compose a draft for a channel + audience, run the medical-safety + citation reviews, export |
| **Content** | One `ContentItem` → many `ContentVariant`s; edit → review → mark reviewed → schedule → publish each |
| **Pipeline / List / Calendar** | The work-in-progress board, a sortable table, and the scheduled-content calendar |
| **Campaigns** | Group content into themed series with a status rollup |
| **Connections** | Connected accounts, content-generator status (live vs mock), and publishing destination readiness |
| **Analytics** | Reach across networks, scheduled vs published, timing suggestions |

Safety is first-class: variants carry a **medical-safety** review and a
**citation** review (citation-needed + citation-support), and a variant can't be
exported until its blocking findings are resolved and it's marked human-reviewed.

---

## Quick start

```bash
cd content-calendar
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm test         # run the full test suite once
npm run test:watch   # watch mode
npm run coverage     # test coverage report
npm run build        # type-check + production build
npm run typecheck    # type-check only
```

> **No real API keys required.** The app ships with realistic sample data and
> mock/local implementations, so every flow works offline and in tests.

### Local mode vs. API mode

The dashboard runs against either backend, chosen by one env var:

| Mode | When | Data |
| --- | --- | --- |
| **Local** (default) | `VITE_API_URL` unset | Sample data + `localStorage`, local safety/citation review, client-side idea generation |
| **API** | `VITE_API_URL` set | Sources, content, reviews, accounts and AI come from the NestJS server (`server/`), with local fallback |

```bash
# Terminal 1 — backend (see ../server/README.md)
cd ../server && npm install && npm run start:dev   # http://localhost:3000/api

# Terminal 2 — frontend pointed at it
echo "VITE_API_URL=http://localhost:3000/api" > .env.local
npm run dev
```

> Prefer the packaged **desktop app** ([`../desktop`](../desktop)) for a real
> local run — it bundles the server and UI into one window, no terminals.

---

## Architecture

The UI depends only on typed client facades, so a mock can be swapped for the
real API without touching components.

```
src/
├── content/      # contentClient — the ContentItem/ContentVariant hub model
│                 #   (LocalContentClient mock vs ApiContentClient; setContentClient for tests)
├── studio/       # local Draft Studio engine — compose + safety/citation review, offline
├── sources/      # Source Inbox client (manual sources + vault notes)
├── lib/          # api client, connection/settings/dataSource seams, platforms, date utils
├── store/        # Zustand store (the older Post calendar path + connected accounts)
├── analytics/    # pure analytics calculations
├── components/   # all React views (see the table above) + ui/ primitives, charts/
├── data/         # realistic sample data (generated relative to "now")
└── App.tsx       # app shell, navigation, store initialization

tests/            # unit + component tests (Vitest + RTL)
```

> **Migration note.** Two content models currently coexist: the newer
> `ContentItem → ContentVariant` hub (`src/content/`, the strategic model) and
> the older `Post` calendar (`src/store/`). New work targets the hub model; the
> Post path remains until the calendar views are migrated onto scheduled variants.

### Client seams

| Seam | File | Local vs API |
| --- | --- | --- |
| Content (items, variants, reviews, campaigns, publish log) | `src/content/contentClient.ts` | `LocalContentClient` ↔ `ApiContentClient` |
| Posts / accounts (calendar) | `src/lib/dataSource.ts` | `LocalDataSource` ↔ `ApiDataSource` |
| Connections snapshot | `src/lib/connections.ts` | local defaults ↔ `GET /api/connections` (provider readiness + connected tokens) |
| Writable local settings | `src/lib/settings.ts` | API-mode only (`GET/PUT /api/settings`) |

Each switches on `VITE_API_URL`, so nothing in the UI changes between modes.

---

## Testing

Vitest + React Testing Library cover the real workflows: the content hub
(items → variants → review → schedule → publish), the Draft Studio engine and
its safety/citation reviews, the Connections panel and settings form, the
calendar/board/list views, connected accounts (verify-and-connect), and the
idea-generation flows.

```bash
npm test
```

---

## Tech choices & rationale

- **Local-first, swap-by-config.** Every boundary (content, posts, connections,
  settings, AI) has a local mock and an API adapter chosen by `VITE_API_URL`, so
  the demo becomes a real product incrementally.
- **Zustand** for the calendar store — minimal boilerplate, easy to test.
- **No charting / icon / DnD dependencies** — charts and icons are hand-built
  SVG; drag-and-drop uses native HTML5 events with a pure reschedule function.
  Small bundle, reliable installs, trivially unit-testable logic.
