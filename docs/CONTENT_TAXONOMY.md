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
| `threads` | A Threads post / thread. |
| `instagram` | An Instagram post. |
| `newsletter` | A newsletter section or issue. |
| `teaching` | Teaching / course material. |

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
