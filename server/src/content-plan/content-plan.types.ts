/**
 * ContentPlan — the shared backbone extracted once from a source and rendered
 * many ways (carousel slides, a long-form talk, short videos). The atom is the
 * *point*: a claim, optionally its evidence and its "so what". Rendering a plan
 * never invents content the plan didn't carry, so every surface stays consistent
 * and traceable to the same source.
 */
export interface ContentPoint {
  /** The core assertion — a source sentence, kept source-faithful. */
  claim: string;
  /** Supporting detail / evidence, when available. */
  evidence?: string;
  /** Why it matters to the audience, when available. */
  soWhat?: string;
}

export interface ContentPlan {
  sourceId: string;
  /** The opening hook (usually the source title). */
  hook: string;
  points: ContentPoint[];
  /** The single closing action. */
  cta: string;
}

export interface ContentPlanOptions {
  /** Cap on the number of points to extract. */
  maxPoints?: number;
  cta?: string;
}
