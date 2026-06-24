import { ContentItem, ContentVariant } from '../domain/academic';
import {
  itemNoteBasename,
  renderItemNote,
  renderVariantNote,
  variantNoteBasename,
} from './content-note';

const item: ContentItem = {
  id: 'ci_abc123',
  title: 'Street trees & urban heat',
  sourceIds: ['src_1'],
  campaignId: 'cmp_1',
  audience: 'public',
  pillar: 'research-finding',
  evidenceLevel: 'observational',
  claimRisk: 'low',
  status: 'reviewed',
  createdAt: 'x',
  updatedAt: 'x',
};

function variant(over: Partial<ContentVariant> = {}): ContentVariant {
  return {
    id: 'cv_xyz789',
    contentItemId: 'ci_abc123',
    channel: 'linkedin',
    format: 'post',
    body: 'The copy.',
    hashtags: [],
    status: 'reviewed',
    createdAt: 'x',
    updatedAt: 'x',
    ...over,
  };
}

describe('content notes', () => {
  it('builds stable basenames', () => {
    expect(itemNoteBasename(item)).toBe('street-trees-urban-heat-abc123');
    expect(variantNoteBasename(variant())).toBe('linkedin-post-xyz789');
  });

  it('renders an item hub: strategy frontmatter + source/variant backlinks', () => {
    const note = renderItemNote(item, {
      sourceTitles: { src_1: 'Trees and Heat' },
      variantBasenames: ['linkedin-post-xyz789', 'bluesky-thread-aaa111'],
    });
    expect(note).toContain('forskai: content-item');
    expect(note).toContain('pillar: research-finding');
    expect(note).toContain('claim_risk: low');
    expect(note).toContain('## Sources\n- [[Trees and Heat]]');
    expect(note).toContain('- [[linkedin-post-xyz789]]');
    expect(note).toContain('- [[bluesky-thread-aaa111]]');
  });

  it('renders a variant note backlinking to its item, flagging not-cleared', () => {
    const note = renderVariantNote(
      variant({ safetyReview: { claims: [], findings: [], reviewedAt: 'x', cleared: false }, hook: 'Hi' }),
      { itemBasename: 'street-trees-urban-heat-abc123' },
    );
    expect(note).toContain('forskai: content-variant');
    expect(note).toContain('review_cleared: false');
    expect(note).toContain('[!warning] Not cleared');
    expect(note).toContain('Part of:: [[street-trees-urban-heat-abc123]]');
    expect(note).toContain('**Hi**');
  });
});
