# Forskai Studio — Brand System

A calm research instrument. Trust over decoration. **Color maps to function, never to mood.**

**Vahtian** is the mother company. **Forskai** is its research-intelligence brand —
*test before you trust*. Forskai's flagship ([forskai.com](https://www.forskai.com))
stress-tests a study **design before data collection**, returning **PASS / RISK /
FAIL** with the fixes that still fit the budget. **Forskai Studio** (this repo)
applies the same principle downstream: it turns sources into reviewed,
audience-specific content, gated on supported claims. The ***vahti** family (e.g.
**CiteVahti**) is the verification layer that powers both. One promise across all of
it: *nothing proceeds until the evidence holds.* The mark says exactly that — the
signal broadcasts only after it clears the review gate.

## Brand hierarchy

```
Vahtian  ·  mother company / house brand
└─ Forskai  ·  research intelligence — "test before you trust"      accent: teal
   ├─ Forskai (forskai.com)   Research Design Intelligence · PASS / RISK / FAIL
   └─ Forskai Studio          sources → reviewed, audience-specific content
   verification powered by the *vahti family (CiteVahti, …)           accent: violet
```

**When to use which name**

| Use… | For… |
|------|------|
| **Vahtian** | The company / legal entity. Footers, ownership, "A Vahtian company." |
| **Forskai** | The brand, and the flagship Research Design Intelligence product (forskai.com). Teal. |
| **Forskai Studio** | The research-content workspace (this repo). |
| ***vahti** (e.g. **CiteVahti**) | Any verification surface — claim review, citation check, audit trail. Attribute review *results* to the specific *vahti product. Violet. |

**Naming convention** — verification products are `<Capability>Vahti` (PascalCase,
capability + "Vahti"; *vahti* = "guard / watch"). Lowercase `*vahti` only as the
family noun ("*vahti products"). Color stays semantic: **teal = Forskai / create**,
**violet = *vahti / verify** — the brands ride on the function colors, never the
reverse.

## The mark

A central **dot** (the source / claim) sits inside a **violet review ring** with a
single exit gap, then **teal arcs** broadcast the signal forward. The signal leaves
the gate only after it has passed review. It is directional (forward), two-tone
(verify → communicate), and gapped — deliberately *not* a concentric Wi-Fi fan.

| File | Use |
|------|-----|
| `logo/icon-reviewed.svg` | Primary icon mark |
| `logo/icon-minimal.svg` / `icon-broadcast.svg` | Alternate concepts |
| `logo/icon-mono.svg` | Monochrome (`currentColor`) |
| `logo/lockup-horizontal.svg` | Horizontal lockup |
| `logo/app-icon.svg` | Square / desktop app icon |
| `logo/banner.svg` | README / LinkedIn / slide banner |

**Clear space** = the dot diameter on all sides. **Minimum size** 16px (icon),
96px (lockup). Below 20px use the mono mark and drop the faintest outer arc.

**Wordmark** — set as **forskai · Studio**: lowercase `forskai` semibold in ink
(matching forskai.com), a muted middot divider, then `Studio` in regular muted.
`forskai` is the house brand; `Studio` is a product descriptor, never equal weight.
Use the mark alone or `forskai` alone where the workspace context is already clear.

**Don't:** recolor the rings off-function · close the review-ring gap · add a
gradient/glow/sparkle · rotate the broadcast to a corner (reads as Wi-Fi) · stretch
the lockup · place on a busy photo.

## Color → function

| Token | Function | Light | Dark |
|-------|----------|-------|------|
| `--fs-create` | create / communicate | `#1F726B` | `#4FB3A8` |
| `--fs-verify` | review / evidence / trust | `#5B4FA6` | `#9A8CE0` |
| `--fs-ready`  | ready / supported | `#2E7D55` | `#5FBF87` |
| `--fs-review` | needs review | `#9A6700` | `#D9A441` |
| `--fs-stop`   | blocked / overclaim | `#B23A3A` | `#E07A74` |
| `--fs-ink` / `--fs-bg` | workspace | `#1A1B2E` / `#F6F6F2` | `#ECECF2` / `#14151F` |

Never use an accent decoratively. Teal is not "the brand color" — it is *create*
(and, by extension, Forskai). Violet is *verify* (and the *vahti family). If nothing
is being created, verified, or gated, use neutrals.

**Verdict triad** — Forskai's PASS / RISK / FAIL output maps directly onto the
status colors, so the design-intelligence verdict and the content-readiness state
speak the same visual language:

| Verdict | State | Token | Meaning |
|---------|-------|-------|---------|
| **PASS** | ready / supported | `--fs-ready` (green) | The design can recover its signal · claims are supported. |
| **RISK** | needs review | `--fs-review` (amber) | Recoverable with fixes · claims need review. |
| **FAIL** | blocked / overclaim | `--fs-stop` (red) | The design can't recover as planned · export blocked. |

Always pair the color with the word (PASS/RISK/FAIL) and a shape — never color alone.

## Type

- **Headings** — Newsreader (serif): editorial, considered, human.
- **UI / body** — Inter (sans): neutral instrument legibility.
- **Audit / evidence logs** — IBM Plex Mono: provenance, claims, timestamps.

## Files in this kit

```
brand/
  tokens.json              design tokens (source of truth)
  forskai.css              CSS variables, light + dark
  tailwind.brand.cjs       Tailwind theme extension
  components/ForskaiBrand.tsx   reference React components
  logo/*.svg               marks, lockups, banner
  README.md                this file
```

## Use it

```ts
// content-calendar/tailwind.config.js
const forskai = require('../brand/tailwind.brand.cjs');
module.exports = { theme: { extend: forskai.extend }, /* ... */ };
```

```css
/* content-calendar/src/main.css */
@import '../../brand/forskai.css';
```

```tsx
import { Button, StatusBadge, ReviewPanel } from '../../brand/components/ForskaiBrand';
```

Switch themes by setting `data-theme="dark"` on `<html>`.
