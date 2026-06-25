# Content Taxonomy

The controlled vocabulary ForskAI uses across prompts, filters, APIs and the UI.
These values are the single source of truth in
[`server/src/domain/academic.ts`](../server/src/domain/academic.ts) — each list
is a `const` array with a derived TypeScript union, so the allowed values exist
at runtime for validation. Keep this document in sync with that file.

## Source kinds

What a piece of source material is. `SOURCE_KINDS`.

| Value | Meaning |
| --- | --- |
| `paper` | A published paper, preprint or article (often with DOI + abstract). |
| `note` | A personal/research note, e.g. a markdown or Obsidian note. |
| `link` | An external link to a resource. |
| `lecture` | Lecture material, slides or a talk. |

## Channels

Where a piece of content is published. `CONTENT_CHANNELS`.

| Value | Meaning |
| --- | --- |
| `linkedin` | A LinkedIn post. |
| `bluesky` | A Bluesky post / thread. |
| `threads` | A Threads post / thread. |
| `instagram` | An Instagram post. |
| `newsletter` | A newsletter section or issue. |
| `teaching` | Teaching / course material. |
| `talk` | A long-form spoken talk script. |
| `shorts` | A short-form video script. |

## Audiences

Who the content is written for. Drives voice, reading level and — for
patient-facing audiences — stricter safety review. `AUDIENCES`.

| Value | Meaning | Safety handling |
| --- | --- | --- |
| `peers` | Fellow researchers / clinicians. | Standard review. |
| `students` | Students / trainees. | Standard review. |
| `patients` | Patients and carers. | **Patient-safe mode** (see below). |
| `public` | The general public. | **Patient-safe mode** (see below). |

`patients` and `public` are *patient-facing*: a not-medical-advice disclaimer is
added and advisory safety findings are escalated to blocking. See
[`MEDICAL_SAFETY_POLICY.md`](./MEDICAL_SAFETY_POLICY.md).

## Content status

The editorial stage of a generated piece of content. `CONTENT_STATUSES`.

```
idea → draft → reviewed → scheduled → exported
```

| Value | Meaning |
| --- | --- |
| `idea` | An idea from the Idea Lab, not yet drafted. |
| `draft` | A draft has been written. |
| `reviewed` | The draft has been through claim/safety review. |
| `scheduled` | Placed on the content calendar. |
| `exported` | Exported as markdown / copied out for publishing. |

A campaign's progress is a count of its items across these statuses
(`CampaignStatusRollup`).

## Safety severities

How serious a safety finding is. `SAFETY_SEVERITIES`.

| Value | Effect |
| --- | --- |
| `info` | Advisory nudge. |
| `warn` | Advisory but prominent; escalated to `block` for patient-facing audiences. |
| `block` | Must be resolved before the content can clear export. |

## Safety categories

What a safety finding is about. `SAFETY_CATEGORIES`.

| Value | Meaning |
| --- | --- |
| `overclaiming` | Absolute efficacy/safety claims (e.g. "cure", "100% effective"). |
| `causal-language` | Causal wording where the evidence may be correlational. |
| `dosage` | Specific dosing or self-treatment instructions. |
| `unproven-treatment` | Unproven or off-label treatment claims. |
| `identifiable-patient` | Potentially identifiable patient details. |

## Content formats

Per-channel formats are described by the idea generator's `ContentFormat` type
(`carousel`, `reel`, `single image`, `text post`, `video`, `poll`, `story`) in
[`server/src/ai/ideas.types.ts`](../server/src/ai/ideas.types.ts).

## The content model: ContentItem → ContentVariant

A "post" is too flat for academic content: one idea fans out into many
channel/format/audience renderings. The model is two levels.

**`ContentItem`** — one idea, the strategy layer. Fields: `title`,
`sourceIds[]`, `campaignId?`, `ownerId?`, `audience`, `pillar`, `evidenceLevel`,
`claimRisk`, `status`, timestamps.

**`ContentVariant`** — one channel/format rendering of an item, the copy +
lifecycle layer. Fields: `contentItemId`, `channel`, `format`, `body`, `hook?`,
`hashtags[]`, `status`, `safetyReview?`, `citationReview?`, `scheduledAt?`,
`exportedAt?`, timestamps. Export is gated by a cleared `safetyReview`.

### Content pillars

The strategy bucket an idea belongs to. `CONTENT_PILLARS`: `research-finding`,
`explainer`, `methods`, `commentary`, `education`, `behind-the-research`,
`announcement`.

### Evidence levels

Strength of the evidence behind the claims. `EVIDENCE_LEVELS`:
`systematic-review`, `rct`, `observational`, `mechanistic`, `expert-opinion`,
`unknown`.

### Claim risk

How overclaim-prone / sensitive the claims are. `CLAIM_RISKS`: `low`,
`moderate`, `high`.

### Variant formats

The shape a variant takes on its channel (distinct from *where* it publishes).
`VARIANT_FORMATS`: `post`, `thread`, `carousel`, `slide`,
`newsletter-paragraph`, `short-script`, `talk-script`.

## Scheduling & the timing optimizer

A `ContentVariant` carries a `scheduledAt`; the calendar feed
(`GET /api/calendar/content`) surfaces scheduled variants for the dashboard
agenda. The timing optimizer suggests *when* to post:

- **Heuristic baseline** — per-channel best-practice windows (weekday + hour),
  with a small audience nudge. Every score is traceable to a named window.
- **Learned bonus** — an exponentially-weighted moving average (α≈0.3) of
  engagement outcomes per `(channel, audience, weekday, hour)` slot. With no
  data it degrades to the heuristic; as outcomes arrive, good slots float up.

`GET /api/timing/suggestions?channel=&audience=` returns ranked slots (each with
a rationale and how many outcomes informed it). `POST /api/timing/outcomes`
records one. The loop closes automatically: **exporting a variant records a
positive outcome** for its slot, so suggestions adapt to what actually ships.
Local-first and explainable — not an opaque model.

### Learning from real engagement

The optimizer learns from how posts actually perform, not just when they ship:

- **`POST /api/timing/engagement`** — submit raw metrics (`impressions`, `likes`,
  `reposts`, `replies`, `clicks`) for a slot; they're normalised to a weighted
  `[0,1]` signal (repost > reply > click > like; a weighted engagement rate when
  impressions are known, a saturating curve otherwise) and learned as an outcome.
- **`POST /api/engagement/sync`** — pulls metrics for every exported variant from
  the configured `EngagementSource` and records them. The source is a deterministic
  **mock** by default (local-first, offline-friendly); a real connected-account
  source is the config-gated edge — swap by configuration, never by code change.
  The dashboard's **Sync engagement** button calls this.

Recency is built in: the learned score is an exponentially-weighted moving
average (α≈0.3), so recent engagement dominates and stale slots fade. The whole
loop stays explainable — every suggestion reports its rationale and how many
outcomes informed it.
