import type { Platform } from '../types';

/**
 * Reach / anti-throttle preflight.
 *
 * Academics are great at the science and bad at the algorithm game — and the
 * algorithms quietly punish exactly what researchers do by default (drop a
 * paywalled link in the post, stack a dozen hashtags, post a wall of text). This
 * flags those reach-killers BEFORE publishing so it's a deliberate "verify, or
 * redo" step, not a mystery when a good post gets no reach. Deterministic and
 * fully testable; advisory only (it never blocks saving).
 */

export interface ReachFinding {
  /** 'warn' = likely to cut reach; 'tip' = easy improvement. */
  level: 'warn' | 'tip';
  code: string;
  message: string;
}

/** Platforms that demote posts containing outbound links (push the link to a reply). */
const LINK_DEMOTED: Platform[] = ['linkedin', 'instagram', 'threads', 'youtube'];

/** Soft hashtag ceilings before it reads as spammy / gets demoted. */
const HASHTAG_LIMIT: Record<Platform, number> = {
  bluesky: 3,
  mastodon: 4,
  linkedin: 5,
  instagram: 10,
  threads: 5,
  youtube: 5,
};

const URL_RE = /https?:\/\/[^\s]+/gi;
const HASHTAG_RE = /(^|\s)#[\p{L}0-9_]+/gu;

export interface ReachInput {
  platform: Platform;
  body: string;
  /** Number of attached media items (for the alt-text nudge). */
  mediaCount?: number;
}

/** Analyze a post for reach-suppression risks. Returns [] when it looks clean. */
export function analyzeReach({ platform, body, mediaCount = 0 }: ReachInput): ReachFinding[] {
  const findings: ReachFinding[] = [];
  const text = body ?? '';
  const urls = text.match(URL_RE) ?? [];
  const hashtags = text.match(HASHTAG_RE) ?? [];

  // 1. Outbound links in the post body — the single biggest reach-killer.
  if (urls.length > 0 && LINK_DEMOTED.includes(platform)) {
    findings.push({
      level: 'warn',
      code: 'link-in-post',
      message: 'Links in the post get demoted here — post the text, then put the link in the first comment/reply.',
    });
  }

  // 2. Paywalled DOI without a free alternative.
  const hasDoi = /doi\.org\//i.test(text);
  const hasFreeHost = /(arxiv\.org|biorxiv\.org|medrxiv\.org|osf\.io|\.pdf|preprint|psyarxiv|ssrn)/i.test(text);
  if (hasDoi && !hasFreeHost) {
    findings.push({
      level: 'tip',
      code: 'paywalled-link',
      message: 'That DOI may be paywalled — add a free/preprint link (arXiv, bioRxiv, OSF) so readers can actually read it.',
    });
  }

  // 3. Hashtag overload.
  const limit = HASHTAG_LIMIT[platform];
  if (hashtags.length > limit) {
    findings.push({
      level: 'warn',
      code: 'too-many-hashtags',
      message: `${hashtags.length} hashtags reads as spam on ${platform} — keep it to about ${limit}.`,
    });
  }

  // 4. No hook / wall of text.
  const firstLine = text.split('\n')[0] ?? '';
  if (text.length > 280 && !text.slice(0, 280).includes('\n')) {
    findings.push({
      level: 'tip',
      code: 'wall-of-text',
      message: 'Break it up — lead with a one-line hook and add line breaks; dense blocks lose scrollers.',
    });
  } else if (firstLine.length > 120) {
    findings.push({
      level: 'tip',
      code: 'weak-hook',
      message: 'Open with a short, punchy first line — the hook is what stops the scroll.',
    });
  }

  // 5. Shouting — several ALL-CAPS words (ignores short acronyms and links).
  const capsWords = (text.replace(URL_RE, '').match(/\b[A-Za-z]{3,}\b/g) ?? []).filter(
    (w) => w === w.toUpperCase(),
  );
  if (capsWords.length >= 3) {
    findings.push({
      level: 'tip',
      code: 'all-caps',
      message: 'Ease off the ALL-CAPS — it reads as shouting and can trip spam filters.',
    });
  }

  // 6. Media without alt text (accessibility + reach).
  if (mediaCount > 0) {
    findings.push({
      level: 'tip',
      code: 'alt-text',
      message: 'Add alt text to your image/video — it widens your audience and platforms favour accessible posts.',
    });
  }

  return findings;
}

export interface ReachVerdict {
  tone: 'good' | 'warn';
  message: string;
  warnings: number;
  tips: number;
}

/** Summarize findings into a single headline for the preflight panel. */
export function reachVerdict(findings: ReachFinding[]): ReachVerdict {
  const warnings = findings.filter((f) => f.level === 'warn').length;
  const tips = findings.filter((f) => f.level === 'tip').length;
  if (findings.length === 0) {
    return { tone: 'good', message: 'Looks good — nothing here should hurt your reach.', warnings, tips };
  }
  if (warnings > 0) {
    return {
      tone: 'warn',
      message: `${warnings} thing${warnings > 1 ? 's' : ''} likely to cut your reach — worth fixing before you post.`,
      warnings,
      tips,
    };
  }
  return { tone: 'warn', message: `${tips} quick improvement${tips > 1 ? 's' : ''} to reach more people.`, warnings, tips };
}
