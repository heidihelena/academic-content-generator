# Product direction & UI/UX critique

**Verdict: build the editorial operating system, not a Postiz clone.** The
winning framing isn't "schedule this post to 12 platforms" — it's *"what should
we publish, why, who approved it, which version goes where, what's missing, and
what happened after."* That product is smaller, more useful for
academic/medical/institutional content, and harder for generic schedulers to
copy.

This doc critiques what exists today against that target and lays out a phased
plan mapped onto the current codebase.

---

## 1. Where we are today

The repo already ships a working slice of Phase 1:

| Capability | Status today |
| --- | --- |
| Calendar Week view | ✅ |
| Calendar **Month / Day** views | ✅ (PR #8) |
| Filters (platform, status) + **search** | ✅ (sidebar, PR #8) |
| Drag-and-drop reschedule | ✅ (native HTML5) |
| Post editor | ✅ — but a **modal**, not a side drawer |
| **Bulk** select + status/delete | ✅ (PR #8) |
| **Conflict** detection + modal | ✅ (PR #8) |
| Media upload (public URL) | ✅ (PR #7) |
| Per-platform **preview** | ✅ |
| Analytics | ✅ (basic) |
| Backend: posts/scheduler/accounts | ✅ (NestJS) |
| Persistence: memory / SQLite / **Neon+pgvector** | ✅ |
| Real IG/LinkedIn/Threads publish | ✅ (config-gated) |
| Vault vector search + RAG ideas | ✅ |

So the calendar/planning surface is real. The **gap is the operating system
around it**: workflow, variants, campaigns, ownership, approval, and a
manual-publish assistant.

---

## 2. UI/UX critique of the current dashboard

Honest assessment against the editorial-OS target:

1. **Editor is a centered modal, not a right-side drawer.** It forces a context
   switch away from the calendar. The card→drawer pattern (calendar stays
   visible) is core to the workflow and should replace the modal.
2. **One post = one platform.** The data model has no "master idea" with
   per-channel **variants**. Cross-posting identical copy is exactly the bad UX
   to avoid. This is the single biggest model change.
3. **No workflow view.** Status is a flat enum optimized for *publishing*
   (`draft/scheduled/published/failed`), not *editorial work*
   (`idea → draft → review → approved → scheduled → published → rework`). There's
   no **Kanban** — and "real content work is workflow, not dates."
4. **No campaigns, owners, or approval.** Cards can't show owner/campaign;
   there's no review gating (e.g. *needs medical/legal review*, *approved for
   scientific accuracy*). For health/science comms this is the critical feature.
5. **No List/table view** for triage and bulk editing.
6. **No manual-publish assistant.** Publishing is all-or-nothing API. The 80%
   solution — *copy text / download asset / open platform / mark published / add
   final URL / paste performance notes* — is missing.
7. **Permissions are stubbed** (all-true). Fine for now, but approval workflow
   needs real roles.
8. **Strategy fields absent** — content pillars, target audience, evidence/source,
   claim-risk, CTA, campaign objective, reuse history. This is where the product
   beats an "AI copilot."

None of this is wasted work — the calendar, filters, bulk, conflicts, previews,
media, and the swappable Postgres backend are the foundation the OS sits on.

---

## 3. Target feature set → gap map

| Target | Have | Plan |
| --- | --- | --- |
| Calendar: Week / Month / **Campaign timeline** | Week+Month+Day | Add campaign-timeline view |
| **Kanban** (idea→…→rework) | ❌ | New view + workflow status enum |
| **List/table** | ❌ | TanStack Table |
| **Right-side detail drawer** | modal | Convert editor to drawer |
| Card shows channel/title/status/**owner/campaign** | channel/title/status | Add owner + campaign + model fields |
| **Platform text variants** | ❌ | `ContentItem` + `ContentVariant` model |
| **Campaigns** | ❌ | `Campaign` model + view + color |
| **Approval workflow** | ❌ | review states + `StatusChange` log |
| **Manual-publish assistant** | ❌ (API only) | copy/download/open/mark/url/notes + `PublishLog` |
| Checklist / comments | ❌ | `ChecklistItem` + `Comment` |
| Templates | ❌ | Phase 2 |
| Strategy fields (pillars, evidence, claim-risk…) | ❌ | model fields, Phase 1–2 |

---

## 4. Data model evolution

Today the backend has a single flat `Post`. The OS needs the richer graph you
specified. Migration path (additive, no big-bang rewrite):

```
Post  ──►  ContentItem (the "master idea")
              └── ContentVariant[]  (per-channel body/headline/hashtags/cta/status/char_count)
ContentItem ── Campaign (optional)
ContentItem ── owner (User)
ContentItem ── Asset[] · ChecklistItem[] · Comment[] · StatusChange[]
ContentVariant ── PublishLog (published_url, published_at, notes, metrics_snapshot)
```

New entities: `User`, `Workspace`, `Channel`, `Campaign`, `ContentItem`,
`ContentVariant`, `Asset`, `Comment`, `ChecklistItem`, `StatusChange`,
`PublishLog`.

**Compatibility:** keep the current `Post`-shaped REST for one release; expose
`ContentItem` alongside and migrate the frontend store from `Post` →
`ContentItem` + `ContentVariant`. The existing `DataSource`/repository interfaces
make this a backend-adapter change, not a UI rewrite.

---

## 5. Recommended structure

```
/content
  /calendar      (week · month · campaign-timeline)
  /kanban
  /list
  /campaigns
  /templates
  /assets
```

Main screen: left **Sidebar** (nav) · **Toolbar** (view switch + filters:
channel/status/owner/campaign) · canvas · **right drawer** on selection — which
is exactly the shape PR #8 introduced; it extends naturally to Kanban/List.

---

## 6. Stack recommendation (honest)

Your suggested stack (Next.js, shadcn/ui, Prisma/Drizzle, React Big Calendar /
FullCalendar, dnd-kit, TanStack Table, Auth.js/Clerk/Supabase, UploadThing/S3)
is a great greenfield choice. But we are **not greenfield** — Phase 1's calendar,
drawer-able editor, filters, bulk, conflicts, media, and a swappable
**Postgres+pgvector** backend already exist on Vite + React + Tailwind + Zustand
+ NestJS.

**Recommendation: evolve, don't rewrite.**

- **Keep** Vite + React + Tailwind + Zustand + NestJS. A Next.js/shadcn port is a
  multi-week rewrite that reproduces what we have, for little near-term value.
  (Revisit Next.js only if SSR/SEO for public content pages becomes a goal.)
- **Add** `dnd-kit` (robust DnD for Kanban *and* calendar — replaces the native
  HTML5 handlers), `TanStack Table` (List view). Both drop in cleanly.
- **Keep** the hand-rolled calendar (no heavy dep, already does Month/Week/Day);
  adopt FullCalendar only if the campaign-timeline view needs it.
- **Backend**: the Nest `neon` driver is already Postgres — introduce **Prisma**
  there for the new relational model (it coexists with the current repositories).
- **Auth**: add in Phase 1.5 (Auth.js or Clerk) — required before real approval
  workflow; today permissions are stubbed.
- **Storage**: already abstracted (`StorageService`, local/S3) — no change.

This keeps every shipped feature working while moving toward the OS.

---

## 7. Build order (mapped to this repo)

**Phase 1 — planning only** (largely started)
- [x] Calendar Month/Week/Day, filters, drag-drop, bulk, conflicts (PR #8)
- [x] Media upload (PR #7)
- [ ] **Editor modal → right-side drawer** (reuse current form)
- [ ] **`ContentItem` + `ContentVariant`** model (master idea + per-channel copy)
- [ ] **Kanban** view (dnd-kit) with the editorial status enum
- [ ] **List/table** view (TanStack Table)
- [ ] **Campaigns** (model + campaign-timeline calendar + color)
- [ ] **Owner**, checklist, comments on the drawer
- [ ] **Manual-publish assistant** (copy/download/open/mark/url/notes + `PublishLog`)

**Phase 2 — intelligence**
- Templates; content pillars; duplicate detection; "what's missing this week",
  "too much of one topic", "no owner", "approved but unscheduled", "scheduled but
  missing asset" (these are cheap, high-value derived checks).

**Phase 3 — assisted publishing**
- Copy buttons, platform deep links, CSV export, **ICS calendar export**, webhook
  to Make/Zapier/n8n.

**Phase 4 — API publishing**
- Already have IG/LinkedIn/Threads clients; per your guidance, lead with
  **LinkedIn or WordPress**, not IG/X/TikTok.

---

## 8. Recommended next step

Start Phase 1's spine in two PRs:

1. **Editor → right-side drawer** + add **owner/campaign** fields to cards and the
   drawer (small, immediately better UX; reuses the existing form).
2. **`ContentItem` + `ContentVariant`** model on the backend (Prisma on the neon
   driver) with a compatibility shim, then point the store at it — unlocking
   per-platform variants, which is the feature that most differentiates this tool.

Then Kanban (dnd-kit) + the manual-publish assistant.

> The differentiators to protect throughout: **variants**, **approval workflow**,
> **strategy fields** (pillars/evidence/claim-risk), and **reuse/derivatives**.
> Those make this an editorial OS, not another scheduler.
