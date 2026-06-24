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
    const hook = req.hook?.trim() || `New from our work: ${req.title}`;
    const angle = req.angle?.trim() || req.title;
    const gist = req.material.trim().slice(0, 280);

    const lines = [hook, '', `${angle}.`];
    if (gist) lines.push('', gist);
    lines.push('', `— for ${req.audience} · ${req.channel}`);
    return lines.join('\n');
  }
}
