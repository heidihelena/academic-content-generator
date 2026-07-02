import { LlmClient, LlmCompletion } from '../ai/llm-client';
import { AgenticDraftComposer } from './agentic.composer';
import { ComposeRequest } from './composer.types';

/** Deterministic fake: replays a scripted list of responses (or errors). */
class FakeLlmClient implements LlmClient {
  readonly name = 'fake:test';
  readonly calls: LlmCompletion[] = [];

  constructor(private readonly responses: Array<{ body: string } | Error>) {}

  async completeJson<T>(req: LlmCompletion): Promise<T> {
    this.calls.push(req);
    const next = this.responses.shift();
    if (!next) throw new Error('fake exhausted');
    if (next instanceof Error) throw next;
    return next as T;
  }
}

const req = (over: Partial<ComposeRequest> = {}): ComposeRequest => ({
  title: 'Street trees and heat',
  material: 'Tree cover was associated with cooler streets.',
  channel: 'linkedin',
  audience: 'peers',
  ...over,
});

// Passes the overclaiming review untouched.
const CLEAN = 'Tree cover was linked with cooler streets in our data.';
// "guaranteed" → one block-severity overclaiming finding.
const BLOCKED = 'Tree cover is guaranteed to cool your street.';

describe('AgenticDraftComposer', () => {
  it('does no revision call when the first draft reviews clean', async () => {
    const client = new FakeLlmClient([{ body: CLEAN }]);
    const composer = new AgenticDraftComposer(client);

    expect(await composer.composeDraft(req())).toBe(CLEAN);
    expect(client.calls).toHaveLength(1); // compose only
  });

  it('revises a draft with a block finding and the clean revision wins', async () => {
    const client = new FakeLlmClient([{ body: BLOCKED }, { body: CLEAN }]);
    const composer = new AgenticDraftComposer(client);

    expect(await composer.composeDraft(req())).toBe(CLEAN);
    expect(client.calls).toHaveLength(2); // compose + one revision

    // The revision prompt hands the model its own draft and the findings.
    const revision = client.calls[1];
    expect(revision.user).toContain(BLOCKED);
    expect(revision.user).toContain('[block] overclaiming');
    expect(revision.system).toContain('Safety rules');
  });

  it('keeps the best attempt when a revision gets worse', async () => {
    const worse = 'Tree cover is guaranteed to work and cures heat stress.'; // two blocks
    const client = new FakeLlmClient([{ body: BLOCKED }, { body: worse }, { body: CLEAN }]);
    const composer = new AgenticDraftComposer(client);

    expect(await composer.composeDraft(req())).toBe(CLEAN);
    expect(client.calls).toHaveLength(3);
  });

  it('falls back to the single-shot draft when a revision call errors', async () => {
    const client = new FakeLlmClient([{ body: BLOCKED }, new Error('ollama down')]);
    const composer = new AgenticDraftComposer(client);

    expect(await composer.composeDraft(req())).toBe(BLOCKED);
    expect(client.calls).toHaveLength(2);
  });

  it('falls back to the local composer when even the first call errors', async () => {
    const client = new FakeLlmClient([new Error('ollama down')]);
    const composer = new AgenticDraftComposer(client);

    const draft = await composer.composeDraft(req());
    expect(draft).toContain('Street trees and heat'); // deterministic local draft
    expect(client.calls).toHaveLength(1); // no revision of a clean local draft
  });

  it('stops at the cap: at most 2 revision rounds (3 LLM calls)', async () => {
    const still1 = 'Trees are guaranteed to cool streets a bit.';
    const still2 = 'Trees are guaranteed to help, we think.';
    const client = new FakeLlmClient([
      { body: BLOCKED },
      { body: still1 },
      { body: still2 },
      { body: CLEAN }, // must never be requested
    ]);
    const composer = new AgenticDraftComposer(client);

    const draft = await composer.composeDraft(req());
    expect(client.calls).toHaveLength(3);
    expect(draft).toBe(still2); // equal scores → the later iteration wins
  });

  it('delegates hooks to the inner composer unchanged', async () => {
    const client = new FakeLlmClient([{ body: 'x' }]);
    // Hook responses use { hook } — the fake's { body } yields an empty hook,
    // so the inner composer falls back to the local one deterministically.
    const composer = new AgenticDraftComposer(client);
    expect(await composer.composeHook(req())).toBe('New from our work: Street trees and heat');
    expect(client.calls).toHaveLength(1);
  });
});
