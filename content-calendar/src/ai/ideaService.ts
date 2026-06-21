import type { IdeaGenerator, IdeaRequest, IdeaResponse } from './types';
import { MockIdeaGenerator } from './mockIdeaGenerator';
import { buildIdeaMessages } from './prompt';

/**
 * Idea service facade.
 *
 * The app calls `generateIdeas(...)` and never constructs a generator directly.
 * Swapping the mock for a real model is a one-line change in `activeGenerator`.
 */

let activeGenerator: IdeaGenerator = new MockIdeaGenerator();

/** Override the active generator (used by tests and the real-API switch). */
export function setIdeaGenerator(generator: IdeaGenerator): void {
  activeGenerator = generator;
}

export function getIdeaGenerator(): IdeaGenerator {
  return activeGenerator;
}

export function generateIdeas(request: IdeaRequest): Promise<IdeaResponse> {
  return activeGenerator.generate(request);
}

/**
 * Reference skeleton for a real LLM-backed generator.
 *
 * // --- REAL API INTEGRATION POINT -----------------------------------------
 * // 1. Add the provider SDK and an API key (read from an env var, never hard-code).
 * // 2. Send `buildIdeaMessages(request)` to the chat-completions endpoint with
 * //    JSON-mode / response_format enabled.
 * // 3. Parse and validate the JSON into PostIdea[] (enforce exactly 5 ideas).
 * // 4. Call setIdeaGenerator(new LlmIdeaGenerator()) at app startup.
 * //
 * // Example shape (pseudo-code):
 * //   class LlmIdeaGenerator implements IdeaGenerator {
 * //     readonly name = 'llm-generator';
 * //     async generate(request: IdeaRequest): Promise<IdeaResponse> {
 * //       const messages = buildIdeaMessages(request);
 * //       const res = await client.chat.completions.create({
 * //         model: '<your-model>',
 * //         messages,
 * //         response_format: { type: 'json_object' },
 * //       });
 * //       const parsed = JSON.parse(res.choices[0].message.content);
 * //       return { request, ideas: parsed.ideas.map(withId), source: this.name };
 * //     }
 * //   }
 * // ------------------------------------------------------------------------
 */
export const __realApiReference = { buildIdeaMessages };
