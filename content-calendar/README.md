# vahtian · Content Calendar

A production-quality, dark-mode **social media content calendar dashboard** for the
vahtian.com social media team. Plan a week of content across **Instagram, LinkedIn
and Threads**, edit and drag posts to reschedule, manage connected accounts,
review analytics, and generate post ideas with an AI assistant.

> Built with React + TypeScript + Vite + Tailwind + Zustand, and tested with
> Vitest + React Testing Library.

---

## Features

| Area | What it does |
| --- | --- |
| **Weekly calendar** | 7-day Monday-start view, per-day post cards, week navigation, today highlighting |
| **Drag & drop** | Drag any post to another day to reschedule (time-of-day preserved) |
| **Post editor** | Platform picker, caption with live character count + per-platform limit enforcement, schedule date/time, status, media placeholders, and a live per-platform preview |
| **Filters** | Filter the calendar by platform (Instagram / LinkedIn / Threads) and by status |
| **Statuses** | `draft` · `scheduled` · `published` · `failed`, color-coded throughout |
| **Connected accounts** | Connect / disconnect / retry with status, handles, follower counts and platform icons (mock OAuth) |
| **Analytics** | Posts per week, breakdown by platform, scheduled vs published, best posting days (mock engagement) |
| **Generate Ideas (AI)** | Enter niche / audience / tone / platform → get 5 structured ideas (topic, hook, platform fit, recommended format); one click turns an idea into a draft |
| **UX states** | Loading, empty and error states across every async surface |

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
> mock integrations so it runs end-to-end out of the box.

### Local mode vs. API mode

The dashboard runs against either backend, chosen by one env var:

| Mode | When | Data |
| --- | --- | --- |
| **Local** (default) | `VITE_API_URL` unset | Sample data + `localStorage`, mock integrations, client-side AI |
| **API** | `VITE_API_URL` set | Posts/accounts/AI come from the NestJS server (`server/`) |

```bash
# Terminal 1 — backend (see ../server/README.md)
cd ../server && npm install && npm run start:dev   # http://localhost:3000/api

# Terminal 2 — frontend pointed at it
echo "VITE_API_URL=http://localhost:3000/api" > .env.local
npm run dev
```

The selection lives in `src/lib/dataSource.ts` (`LocalDataSource` vs
`ApiDataSource`) and `src/main.tsx` (AI generator). The store depends only on the
`DataSource` interface, so nothing in the UI changes between modes.

---

## Architecture

The codebase is organized around the **four-agent split** described in the brief.
Each agent owns a clear slice of the tree, and the layers talk to each other only
through typed interfaces — so any mock can be swapped for a real implementation
without touching the UI.

```
src/
├── types/             # Architecture & Data Agent — domain models (single source of truth)
├── lib/               #   platforms, date utils, pure scheduling, ids, persistence
├── data/              #   realistic sample data (generated relative to "now")
├── store/             #   Zustand store (state management + persistence wiring)
├── integrations/      #   social platform integration layer (PlatformIntegration interface + mock)
├── analytics/         #   pure analytics calculations
│
├── ai/                # AI Feature Agent — Generate Ideas
│   ├── types.ts       #   IdeaGenerator interface, request/response types
│   ├── prompt.ts      #   system + user prompt construction (reused by a real LLM)
│   ├── mockIdeaGenerator.ts  # deterministic offline generator
│   └── ideaService.ts #   swappable facade (setIdeaGenerator)
│
├── components/        # UI & Design Agent — all React components
│   ├── WeeklyCalendar, PostCard, PostEditorModal, PostPreview
│   ├── Filters, PlatformBadge, ConnectedAccounts, Analytics, GenerateIdeas
│   ├── Sidebar, Header, icons
│   ├── charts/        #   dependency-free SVG bar + donut charts
│   └── ui/            #   reusable primitives: Modal, Spinner, States (empty/loading/error)
│
└── App.tsx            # app shell, navigation, store initialization

tests/                 # Testing Agent — unit + component tests (Vitest + RTL)
```

### Data flow

```
UI components ──▶ Zustand store ──▶ PersistenceAdapter (localStorage mock)
                      │
                      ├──▶ PlatformIntegration (mock OAuth / publish)
                      └──▶ pure logic: scheduling, analytics, dateUtils
```

The store is the only stateful surface. It depends on the `PersistenceAdapter`
and `PlatformIntegration` **interfaces**, not concrete classes, which keeps the
whole app testable and backend-agnostic.

---

## Swapping in real services

Every integration point is marked in code with a
`// --- REAL API INTEGRATION POINT ---` comment. The key seams:

1. **Persistence** — `src/lib/persistence.ts`
   Implement `PersistenceAdapter` against your REST/GraphQL backend and pass it
   to the store. Nothing else changes.

2. **Social platforms** — `src/integrations/`
   Implement `PlatformIntegration` per platform (real OAuth handshake, profile
   fetch, media upload, publish) and register it in `registry.ts`. Suggested
   APIs: Instagram Graph API, LinkedIn Marketing API, Threads API.

3. **AI idea generation** — `src/ai/ideaService.ts`
   The prompt (`src/ai/prompt.ts`) is already production-shaped. Implement an
   `IdeaGenerator` that sends `buildIdeaMessages(request)` to your LLM with JSON
   output mode, then call `setIdeaGenerator(new LlmIdeaGenerator())` at startup.

---

## Testing

The Testing Agent suite covers the core product logic and UI:

- **Pure logic** — date math, drag-and-drop rescheduling, analytics calculations,
  AI idea generation + prompt construction.
- **Store** — initialization, filtering, post CRUD, reschedule, and connected
  account state transitions (connect / error / disconnect).
- **Components** — calendar rendering, platform/status filtering, empty states,
  week navigation, drag-and-drop reschedule, the post editor (character limits,
  save, delete, preview), connected-accounts UI, and the Generate Ideas flow.

```bash
npm test
```

---

## Tech choices & rationale

- **Zustand** for state — minimal boilerplate, easy to test, no providers.
- **No charting / icon / DnD dependencies** — charts and icons are hand-built
  SVG and drag-and-drop uses native HTML5 events with a **pure** reschedule
  function (`src/lib/scheduling.ts`). This keeps the bundle small, installs
  reliable, and the logic trivially unit-testable.
- **Interfaces at every boundary** — persistence, platform integrations and the
  AI generator are all swappable, so the mock demo can become a real product
  incrementally.
```
