import { ComposeRequest, DraftComposer } from './composer.types';

/**
 * Deterministic, dependency-free composer — the local-first default and the
 * fallback for the LLM composer. Assembles a hook and a simple structured draft
 * from the source + idea.
 */
export class LocalDraftComposer implements DraftComposer {
  readonly name = 'local-composer';

  async composeHook(req: ComposeRequest): Promise<string> {
    return req.hook?.trim() || `New from our work: ${req.title}`;
  }

  async composeDraft(req: ComposeRequest): Promise<string> {
    const hook = req.hook?.trim() || this.defaultDraftHook(req);
    const angle = req.angle?.trim() || req.title;
    const gist = req.material.trim().slice(0, 280);

    if (req.channel === 'linkedin') {
      const lines = [hook];
      if (angle && angle !== req.title) lines.push('', angle);
      lines.push('', 'A few notes for research peers:');
      if (gist) lines.push(gist);
      lines.push(
        '',
        'What I would value from colleagues: does this match what you see in your methods, populations or settings?',
      );
      return lines.join('\n');
    }

    const lines = [hook, '', `${angle}.`];
    if (gist) lines.push('', gist);
    lines.push('', `— for ${req.audience} · ${req.channel}`);
    return lines.join('\n');
  }

  private defaultDraftHook(req: ComposeRequest): string {
    if (req.channel !== 'linkedin') return `New from our work: ${req.title}`;
    return req.audience === 'peers'
      ? `A useful finding to test in other settings: ${req.title}`
      : `A practical note from this work: ${req.title}`;
  }
}
