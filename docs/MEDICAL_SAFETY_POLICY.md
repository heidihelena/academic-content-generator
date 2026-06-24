# Medical Safety Policy

The policy the ForskAI safety reviewers implement. It governs what ForskAI will
and will not help produce, especially for patient- and public-facing content.

Implemented by:
- [`server/src/safety/overclaiming.ts`](../server/src/safety/overclaiming.ts) — medical overclaiming review (#32)
- [`server/src/safety/citation.ts`](../server/src/safety/citation.ts) — citation-needed detector (#33)
- [`server/src/safety/patient-safe.ts`](../server/src/safety/patient-safe.ts) — patient-safe mode (#34)
- [`server/src/safety/safety.service.ts`](../server/src/safety/safety.service.ts) — combines them into a `ReviewState`

> ForskAI is an authoring aid, not a medical device. It does not provide medical
> advice and its automated checks are heuristic — they assist human judgement,
> they do not replace it.

## Principles

1. **No individual medical advice.** Content for patients/public is general
   information, never personalised diagnosis or treatment direction.
2. **No dosing or self-treatment instructions.** Specific doses and
   "take X" directions do not belong in patient/public content.
3. **Claims need support.** Empirical claims should carry a citation; statistics
   and strong effects especially.
4. **Correlation is not causation.** Causal wording must match the evidence;
   observational findings use associative language.
5. **Hedge appropriately.** Avoid absolute efficacy/safety claims; convey
   uncertainty.
6. **Protect patients.** No identifiable patient details.

## Severity model

| Severity | Meaning | Gates export? |
| --- | --- | --- |
| `info` | Advisory nudge. | No |
| `warn` | Advisory, prominent. | No (but see patient-safe escalation) |
| `block` | Must be resolved. | **Yes** |

Content **clears export** only when it has no unresolved `block` finding —
`isCleared(findings)` in [`domain/academic.ts`](../server/src/domain/academic.ts).

## Rules → checks

Each rule maps to a check in the overclaiming reviewer. Default severities:

| Category | Examples flagged | Default severity |
| --- | --- | --- |
| `overclaiming` | "cures", "miracle", "guaranteed", "100% effective", "completely safe", "no side effects" | `block` |
| `causal-language` | "causes", "proven to", "makes you", "leads directly to" | `warn` |
| `dosage` | "500 mg", "take 2", "3 times a day" | `block` |
| `unproven-treatment` | "off-label", "unapproved", "detox", "boosts immunity" | `warn` |
| `identifiable-patient` | "my patient", "patient named …" | `block` |

The citation-needed detector additionally flags empirical claims (quantitative
assertions, evidence-verb statements, causal language) that lack a citation.

## Patient-safe mode

For the patient-facing audiences (`patients`, `public`):

1. A standard disclaimer is added to the draft:
   > This is general information, not medical advice. Talk to a qualified health
   > professional about your situation.
2. **Stricter thresholds:** `warn` findings in `causal-language` and
   `unproven-treatment` are **escalated to `block`**, so they must be resolved
   before export.

See `escalateForAudience` and `MEDICAL_DISCLAIMER` in `patient-safe.ts`.

## Limitations

- The checks are **heuristic** (rule/regex based) and deliberately err toward
  over-flagging for patient/public safety — expect some false positives.
- They do not catch everything; a human must review patient/public content.
- Plain-language / reading-level rewriting is not yet enforced automatically.
