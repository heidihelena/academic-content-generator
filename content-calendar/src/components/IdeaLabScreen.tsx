import { useState } from 'react';
import type { Audience } from '../content/contentTypes';
import { assessIdea, type IdeaAssessment } from '../idea-lab/ideaAssessment';
import { generateIdeasFromSource, type AcademicIdea, type ContentChannel } from '../idea-lab/ideaLabClient';
import { sourceMaterial, type Source } from '../sources/sourcesTypes';
import { STUDIO_AUDIENCES, type StudioChannel, type StudioSeed } from '../studio/studioTypes';
import { useSourceList } from './source-inbox';
import { SparkleIcon } from './icons';
import { Badge, Button, Card, ErrorState, Heading, Input, Spinner, Text, ToggleGroup } from './ui';

/**
 * Idea Lab — pick one source, get five audience-specific content ideas, each
 * graded before drafting: how risky the material is, whether it needs
 * citations, and whether it must pass the medical-safety review. Ideas hand
 * off to the Draft Studio with their channel, audience and hook pre-filled.
 */

/** Map an idea's content channel to the Draft Studio channel it drafts as. */
const IDEA_STUDIO_CHANNEL: Record<ContentChannel, StudioChannel> = {
  linkedin: 'linkedin',
  bluesky: 'threads',
  threads: 'threads',
  instagram: 'instagram',
  newsletter: 'newsletter',
  teaching: 'teaching',
  talk: 'teaching',
  shorts: 'video-script',
};

const CHANNEL_LABEL: Record<ContentChannel, string> = {
  linkedin: 'LinkedIn post',
  bluesky: 'Bluesky post',
  threads: 'Threads/X thread',
  instagram: 'Instagram caption',
  newsletter: 'Newsletter paragraph',
  teaching: 'Teaching snippet',
  talk: 'Talk outline',
  shorts: 'Short video script',
};

const RISK_TONE: Record<IdeaAssessment['riskLevel'], 'success' | 'warn' | 'danger'> = {
  low: 'success',
  medium: 'warn',
  high: 'danger',
};

/** A patient-safe explainer idea is always on offer — it's the product's point. */
function explainerIdea(source: Source): AcademicIdea {
  return {
    id: 'idea_explainer',
    angle: `What "${source.title}" means for people affected by it`,
    hook: 'Plain-language summary — what we studied, what we found, and what is still uncertain.',
    channel: 'teaching',
    audience: 'patients',
  };
}

interface AssessedIdea {
  idea: AcademicIdea;
  assessment: IdeaAssessment;
  /** Drafts as the patient-safe explainer channel instead of the idea's own. */
  asExplainer?: boolean;
}

function IdeaCard({
  entry,
  source,
  onDraft,
}: {
  entry: AssessedIdea;
  source: Source;
  onDraft: (seed: StudioSeed) => void;
}) {
  const { idea, assessment } = entry;
  const label = entry.asExplainer ? 'Patient-safe explainer' : CHANNEL_LABEL[idea.channel];
  return (
    <li className="space-y-2 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5" data-testid="idea-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge size="chip" tone="brand">
              {label}
            </Badge>
            <Badge size="chip">for {idea.audience}</Badge>
            <Badge size="chip" tone={RISK_TONE[assessment.riskLevel]}>
              {assessment.riskLevel} risk
            </Badge>
            {assessment.citationNeed && (
              <Badge size="chip" tone="info">
                citations needed
              </Badge>
            )}
            {assessment.safetyNeed && (
              <Badge size="chip" tone="review">
                safety review
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-slate-200">{idea.angle}</p>
          <p className="mt-0.5 text-xs text-slate-400">{idea.hook}</p>
          <p className="mt-1 text-[11px] text-slate-500">From: {source.title}</p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() =>
            onDraft({
              title: idea.angle,
              material: sourceMaterial(source),
              sourceId: source.id,
              channel: entry.asExplainer ? 'explainer' : IDEA_STUDIO_CHANNEL[idea.channel],
              audience: idea.audience,
              hook: idea.hook,
            })
          }
        >
          Draft this →
        </Button>
      </div>
    </li>
  );
}

export function IdeaLabScreen({ onDraft }: { onDraft: (seed: StudioSeed) => void }) {
  const list = useSourceList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>('peers');
  const [entries, setEntries] = useState<AssessedIdea[] | null>(null);
  const [generator, setGenerator] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = list.sources.find((s) => s.id === selectedId) ?? null;

  const generate = async (source: Source) => {
    setBusy(true);
    setError(null);
    setEntries(null);
    try {
      const material = sourceMaterial(source);
      const result = await generateIdeasFromSource({ id: source.id, title: source.title, material }, audience);
      const assessed: AssessedIdea[] = result.ideas.map((idea) => ({ idea, assessment: assessIdea(idea, material) }));
      const explainer = explainerIdea(source);
      assessed.push({ idea: explainer, assessment: assessIdea(explainer, material), asExplainer: true });
      setEntries(assessed);
      setGenerator(result.generator);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Idea generation didn’t finish — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_2fr]">
      <Card as="section" aria-label="Pick a source" className="space-y-3 self-start p-4">
        <Heading level={2}>1 · Pick a source</Heading>
        <form onSubmit={list.submitSearch} className="flex gap-2">
          <Input
            aria-label="Search sources"
            placeholder="Search…"
            value={list.query}
            onChange={(e) => list.setQuery(e.target.value)}
          />
        </form>
        {list.loading ? (
          <Spinner />
        ) : list.error ? (
          <ErrorState title="Couldn't load sources" message={list.error} onRetry={() => list.reload(list.query)} />
        ) : list.sources.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No sources yet — add one in the Source Inbox first.</p>
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto" data-testid="idea-lab-sources">
            {list.sources.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setSelectedId(s.id);
                    setEntries(null);
                    setError(null);
                  }}
                  aria-pressed={selectedId === s.id}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                    selectedId === s.id
                      ? 'border-brand-500/50 bg-brand-500/10 text-slate-100'
                      : 'border-surface-700 bg-surface-800/60 text-slate-300 hover:border-surface-600'
                  }`}
                >
                  <span className="mr-1.5 uppercase text-[10px] text-slate-500">{s.kind}</span>
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card as="section" aria-label="Ideas" className="space-y-3 self-start p-4">
        <Heading level={2}>2 · Generate ideas</Heading>
        {!selected ? (
          <p className="py-8 text-center text-xs text-slate-500">Pick a source on the left to see what it could become.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label">Primary audience</p>
                <ToggleGroup
                  ariaLabel="Primary audience"
                  options={STUDIO_AUDIENCES.map((a) => ({ value: a, label: a }))}
                  value={audience}
                  onChange={(a) => a && setAudience(a)}
                />
              </div>
              <Button onClick={() => void generate(selected)} disabled={busy}>
                <SparkleIcon width={14} height={14} /> {entries ? 'Regenerate' : 'Generate 5 ideas'}
              </Button>
            </div>

            {busy && <Spinner />}
            {error && <ErrorState title="Couldn't generate ideas" message={error} onRetry={() => void generate(selected)} />}

            {entries && (
              <>
                <ul className="space-y-2" data-testid="idea-list">
                  {entries.map((entry) => (
                    <IdeaCard key={entry.idea.id} entry={entry} source={selected} onDraft={onDraft} />
                  ))}
                </ul>
                <Text variant="muted">
                  {generator?.startsWith('local')
                    ? 'Generated locally on this computer — enable an AI provider in Settings for richer ideas.'
                    : `Generated by ${generator}.`}
                </Text>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
