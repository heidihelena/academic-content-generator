---
name: ux-review
description: Run a blunt UX/IA review of the forskai Studio UI for its target user (a PhD student or clinician-researcher) and produce exact replacement text plus a prioritized fix plan. Use when the user asks for a UX review, IA review, copy audit, "where do users get stuck", or blunt feedback on screens/labels/flows. Optional arg names a screen or component to scope the review.
---

# /ux-review — blunt UX review with exact replacements

Act as a blunt UX reviewer for a **scientific desktop app**. The target user is
a PhD student or clinician-researcher: time-poor, careful about claims, not a
social-media native. Judge every screen by whether *that* person can get their
work published safely without reading docs.

## Scope

If the user passed an argument, review only that screen/component (find it
under `content-calendar/src/components/`). Otherwise review the whole app:
read the routed views (`src/App.tsx`, `Sidebar.tsx`, `Header.tsx`) and each
major surface (Home, Source Inbox, Draft Studio, Content, Pipeline, Calendar,
Outbox, Connections, Settings, Ideas, Analytics).

Read the actual code — labels, empty states, error strings, button copy,
confirmation flows — not just component names. Check `docs/DESIGN_SYSTEM.md`
so recommendations use the existing primitives (Button, Card, Badge, Field,
ConfirmDialog, Empty/Error/Loading states, the Vahtian review accent).

## Review dimensions (all six, every time)

1. **Where the user gets stuck** — dead ends, unclear next steps, flows that
   require knowledge the UI never gave.
2. **Unclear labels** — jargon, developer vocabulary, competing terms for the
   same concept (the app standardizes on "Approve for publishing", not
   "Export"/"Publish assistant").
3. **Actions needing confirmation** — anything public or irreversible
   (publish, disconnect, delete) must go through `ConfirmDialog`.
4. **Errors needing better recovery** — every error states what went wrong
   and what to do next; repeatable actions get a retry.
5. **What to remove** — duplicated paths, features that compete with the
   primary flow, noise.
6. **What should be the primary action** — exactly one primary button per
   surface; everything else secondary/ghost.

## Output format

- A short verdict per dimension, bluntest finding first.
- **Exact text replacements** in a table: `location · current text → proposed
  text` for buttons, labels, empty states, and errors. Proposed copy is plain
  language (reading grade ≤ 9), active voice, no jargon.
- A prioritized fix plan grouped into small PR-sized batches (A, B, C…), each
  independently shippable, ordered by user impact.
- Respect the medical-safety framing: never suggest copy that weakens the
  review gate or overclaims (see `docs/MEDICAL_SAFETY_POLICY.md` if touching
  safety surfaces).

Deliver the review as analysis only — do not change code unless the user then
asks for specific batches (e.g. "Do A–C").
