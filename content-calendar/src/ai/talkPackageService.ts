import { ApiClient } from '../lib/api';
import type {
  TalkAudience,
  TalkPackage,
  TalkPackageClient,
  TalkPackageRequest,
} from './talkPackageTypes';

/**
 * Talk-package facade — the "magic button". The app calls `generateTalkPackage`
 * and never constructs a client directly. Local mock by default (works offline
 * and in tests); the backend when `VITE_API_URL` is set, which runs the real
 * ContentPlan → talk + shorts → safety review → persisted campaign pipeline.
 */

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function pointCountForDuration(durationMin: number): number {
  return Math.min(5, Math.max(1, Math.round(durationMin / 4)));
}

function estimateMinutes(text: string): number {
  return Math.round((text.split(/\s+/).filter(Boolean).length / 140) * 10) / 10;
}

// Illustrative subset of the canonical server rule (overclaim-terms.ts); the
// authoritative review runs server-side in API mode.
const OVERCLAIMS = [
  /\bproves?\b/i,
  /\bcures?\b/i,
  /\bguarantees?\b/i,
  /\b100% ?(?:accurate|effective|correct)\b/i,
  /\beliminat\w* bias\b/i,
  /\bnever wrong\b/i,
];

function findOverclaims(text: string): string[] {
  const hits: string[] = [];
  for (const re of OVERCLAIMS) {
    const m = text.match(re);
    if (m && !hits.includes(m[0].toLowerCase())) hits.push(m[0].toLowerCase());
  }
  return hits;
}

const DISCLAIMER =
  'This is general information, not medical advice. Talk to a qualified health professional about your situation.';

function renderTalk(title: string, points: string[], audience: TalkAudience, durationMin: number): string {
  const n = points.length;
  const lines = [
    `# ${title}`,
    `_Target: ~${durationMin}-minute talk · ${n} point${n === 1 ? '' : 's'}_`,
    '',
    '## Opening',
    `${title}. Over the next few minutes I'll make ${n} point${n === 1 ? '' : 's'}.`,
    '',
  ];
  points.forEach((claim, i) => {
    lines.push(`## Point ${i + 1} — ${claim}`, `My point: ${claim}`, '');
  });
  lines.push('## Closing', `To recap: ${points.join(' · ')}.`, 'Read more.');
  if (audience === 'patients' || audience === 'public') lines.push(DISCLAIMER);
  return lines.join('\n');
}

function renderShort(claim: string, i: number, n: number, url?: string): string {
  return [
    `[Short ${i + 1}/${n}]`,
    `HOOK: ${claim.split(/[,;:.]/)[0]}`,
    `POINT: ${claim}`,
    `CTA: Read more.${url ? ` — ${url}` : ''}`,
  ].join('\n');
}

/** Deterministic local generator; remembers prior packages per title to show reuse. */
export class MockTalkPackageClient implements TalkPackageClient {
  readonly name = 'local';
  private readonly priorByTitle = new Map<string, string[]>();

  async generate(req: TalkPackageRequest): Promise<TalkPackage> {
    if (!req.title.trim()) throw new Error('Add a title.');
    if (!req.abstract.trim()) throw new Error('Paste an abstract to generate from.');

    const max = pointCountForDuration(req.durationMin);
    const points = splitSentences(req.abstract).slice(0, max);
    const claims = points.length ? points : [req.title];

    const talkBody = renderTalk(req.title, claims, req.audience, req.durationMin);
    const shorts = claims.map((c, i) => ({
      channel: 'shorts' as const,
      body: renderShort(c, i, claims.length, req.url),
    }));

    const allText = [talkBody, ...shorts.map((s) => s.body)].join('\n');
    const findings = findOverclaims(allText);

    const prior = this.priorByTitle.get(req.title) ?? [];
    this.priorByTitle.set(req.title, [
      ...prior,
      `talk/${req.audience}: ${req.title}`,
      ...shorts.map((_, i) => `shorts/${req.audience}: ${claims[i]}`),
    ]);

    return {
      source: 'local',
      estimatedMinutes: estimateMinutes(talkBody),
      talk: { channel: 'talk', body: talkBody },
      shorts,
      review: { cleared: findings.length === 0, findings },
      prior,
    };
  }

  async exportToVault(): Promise<{ paths: string[] }> {
    throw new Error('Vault export needs the backend — set VITE_API_URL to enable it.');
  }
}

interface ApiOutput {
  body: string;
}
interface ApiTalkPackage {
  campaign: { id: string };
  talk: ApiOutput;
  shorts: ApiOutput[];
  review: { cleared: boolean; findings: Array<{ message: string }> };
  estimatedMinutes: number;
}
interface ApiReuse {
  items: Array<{ channel: string; audience: string; hook: string }>;
}

/** Drives the real backend pipeline: create source → talk-package → reuse. */
export class ApiTalkPackageClient implements TalkPackageClient {
  readonly name = 'api';
  constructor(private readonly api: ApiClient) {}

  async generate(req: TalkPackageRequest): Promise<TalkPackage> {
    const source = await this.api.post<{ id: string }>('/sources', {
      kind: 'note',
      title: req.title,
      abstract: req.abstract,
    });
    const prior = await this.api
      .get<ApiReuse>(`/sources/${source.id}/reuse`)
      .then((r) => r.items.map((i) => `${i.channel}/${i.audience}: ${i.hook}`))
      .catch(() => []);

    const res = await this.api.post<ApiTalkPackage>('/talk-package', {
      sourceId: source.id,
      audience: req.audience,
      durationMin: req.durationMin,
      url: req.url,
    });

    return {
      source: 'api',
      estimatedMinutes: res.estimatedMinutes,
      talk: { channel: 'talk', body: res.talk.body },
      shorts: res.shorts.map((s) => ({ channel: 'shorts' as const, body: s.body })),
      review: { cleared: res.review.cleared, findings: res.review.findings.map((f) => f.message) },
      campaignId: res.campaign.id,
      prior,
    };
  }

  exportToVault(pkg: TalkPackage): Promise<{ paths: string[] }> {
    if (!pkg.campaignId) throw new Error('No campaign to export.');
    return this.api.post<{ paths: string[] }>(`/campaigns/${pkg.campaignId}/export`);
  }
}

function createDefault(): TalkPackageClient {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiTalkPackageClient(new ApiClient(baseUrl)) : new MockTalkPackageClient();
}

let active: TalkPackageClient = createDefault();

/** Override the active client (used by tests). */
export function setTalkPackageClient(client: TalkPackageClient): void {
  active = client;
}

export function generateTalkPackage(request: TalkPackageRequest): Promise<TalkPackage> {
  return active.generate(request);
}

export function exportTalkPackage(pkg: TalkPackage): Promise<{ paths: string[] }> {
  return active.exportToVault(pkg);
}
