import { BadRequestException } from '@nestjs/common';
import { LlmClient, LlmCompletion } from '../ai/llm-client';
import { MEDICAL_DISCLAIMER } from '../safety/patient-safe';
import { TransformService } from './transform.service';
import { TransformRequest } from './transform.types';

/** Deterministic fake: replays a scripted list of responses (or errors). */
class FakeLlmClient implements LlmClient {
  readonly name = 'fake:test';
  readonly calls: LlmCompletion[] = [];

  constructor(private readonly responses: Array<{ body: string; note?: string } | Error>) {}

  async completeJson<T>(req: LlmCompletion): Promise<T> {
    this.calls.push(req);
    const next = this.responses.shift();
    if (!next) throw new Error('fake exhausted');
    if (next instanceof Error) throw next;
    return next as T;
  }
}

const req = (over: Partial<TransformRequest> = {}): TransformRequest => ({
  body: 'Tree cover was associated with cooler streets.',
  action: 'clearer',
  ...over,
});

describe('TransformService', () => {
  describe('validation', () => {
    const service = new TransformService(null);

    it('rejects an empty body', async () => {
      await expect(service.transform(req({ body: '  ' }))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an unknown action', async () => {
      await expect(service.transform(req({ action: 'bogus' as never }))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects translate without a supported language', async () => {
      await expect(service.transform(req({ action: 'translate' }))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.transform(req({ action: 'translate', language: 'fr' as never })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects apply-voice without a voice profile', async () => {
      await expect(service.transform(req({ action: 'apply-voice' }))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('LLM path', () => {
    it('returns the single completion and passes action + text in the prompt', async () => {
      const client = new FakeLlmClient([{ body: 'Clearer text.', note: 'simplified' }]);
      const service = new TransformService(client);

      const out = await service.transform(req());
      expect(out).toEqual({ body: 'Clearer text.', note: 'simplified' });
      expect(client.calls).toHaveLength(1);
      expect(client.calls[0].user).toContain('Rewrite for clarity');
      expect(client.calls[0].user).toContain('Tree cover was associated with cooler streets.');
      expect(client.calls[0].system).toContain('Preserve the meaning and the claims');
    });

    it('names the target language for translate and keeps hedge rules in the prompt', async () => {
      const client = new FakeLlmClient([{ body: 'Trädtäcke var förknippat med svalare gator.' }]);
      const service = new TransformService(client);

      const out = await service.transform(req({ action: 'translate', language: 'sv' }));
      expect(out.body).toContain('Trädtäcke');
      expect(client.calls[0].user).toContain('Target language: Swedish');
      expect(client.calls[0].user).toContain('Keep every hedge');
    });

    it('enforces the patient disclaimer even when the model forgets it', async () => {
      const client = new FakeLlmClient([{ body: 'Trees may keep streets cooler.' }]);
      const service = new TransformService(client);

      const out = await service.transform(req({ action: 'for-patients' }));
      expect(out.body).toContain(MEDICAL_DISCLAIMER);
      expect(client.calls[0].user).toContain(MEDICAL_DISCLAIMER); // asked for in the prompt too
    });

    it('describes the voice profile for apply-voice', async () => {
      const client = new FakeLlmClient([{ body: 'In our voice.' }]);
      const service = new TransformService(client);

      const out = await service.transform(
        req({
          action: 'apply-voice',
          voice: {
            name: 'Lab voice',
            tone: 'curious',
            formality: 'informal',
            preferredLength: 'short',
            wordsToAvoid: ['synergy'],
            styleExamples: ['We measured it. Twice.'],
          },
        }),
      );
      expect(out.body).toBe('In our voice.');
      expect(client.calls[0].user).toContain('Tone: curious');
      expect(client.calls[0].user).toContain('Words to avoid: synergy');
      expect(client.calls[0].user).toContain('We measured it. Twice.');
    });

    it('falls back to the local transform when the LLM errors', async () => {
      const client = new FakeLlmClient([new Error('ollama down')]);
      const service = new TransformService(client);

      const out = await service.transform(req());
      expect(out.body).toBe('Tree cover was associated with cooler streets.');
      expect(out.note).toContain('needs a language model');
    });

    it('falls back when the completion is empty', async () => {
      const client = new FakeLlmClient([{ body: '   ' }]);
      const service = new TransformService(client);

      const out = await service.transform(req());
      expect(out.body).toBe('Tree cover was associated with cooler streets.');
      expect(out.note).toContain('needs a language model');
    });
  });

  describe('local fallback (no LLM configured)', () => {
    const service = new TransformService(null);

    it('returns the original text for translate, with a note', async () => {
      const out = await service.transform(req({ action: 'translate', language: 'fi' }));
      expect(out.body).toBe('Tree cover was associated with cooler streets.');
      expect(out.note).toContain('Finnish');
      expect(out.note).toContain('needs a language model');
    });

    it('adds the disclaimer for for-patients', async () => {
      const out = await service.transform(req({ action: 'for-patients' }));
      expect(out.body).toContain(MEDICAL_DISCLAIMER);
    });

    it('does not duplicate an existing disclaimer', async () => {
      const body = `Trees may help.\n\n${MEDICAL_DISCLAIMER}`;
      const out = await service.transform(req({ action: 'for-patients', body }));
      expect(out.body.split(MEDICAL_DISCLAIMER)).toHaveLength(2); // exactly one occurrence
    });

    it('only trims whitespace for shorten', async () => {
      const out = await service.transform(
        req({ action: 'shorten', body: 'One.  \n\n\n\nTwo.' }),
      );
      expect(out.body).toBe('One.\n\nTwo.');
      expect(out.note).toContain('needs a language model');
    });

    it('returns other actions unchanged with a note, never throwing', async () => {
      for (const action of ['more-human', 'more-professional', 'for-linkedin', 'for-clinicians'] as const) {
        const out = await service.transform(req({ action }));
        expect(out.body).toBe('Tree cover was associated with cooler streets.');
        expect(out.note).toContain('needs a language model');
      }
    });
  });
});
