/**
 * Extract the key points of a source's text — the sentences most worth reusing.
 * Deterministic and local (no LLM): scores sentences on evidence signals and
 * returns the top few in their original order, so the researcher sees at a
 * glance what a paper or note actually says.
 */

const QUANTITATIVE = /\b\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?(?:times|fold|x)\b|\bp\s?[<=>]\s?0?\.\d+|\bn\s?=\s?\d+|\b\d{2,}\b/i;
const EVIDENCE_VERB =
  /\b(?:show|shows|showed|found|find|finds|suggest|suggests|demonstrate|demonstrates|indicate|indicates|associated|correlated|reveal|reveals|conclude|concludes)\b/i;
const HEDGE = /\b(?:may|might|could|preliminary|uncertain|limitation|open question)\b/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function extractKeyPoints(text: string, max = 5): string[] {
  const sentences = splitSentences(text.trim());
  if (sentences.length <= max) return sentences;

  const scored = sentences.map((sentence, index) => {
    let score = 0;
    if (QUANTITATIVE.test(sentence)) score += 2;
    if (EVIDENCE_VERB.test(sentence)) score += 2;
    if (HEDGE.test(sentence)) score += 1; // honest uncertainty is a key point too
    if (index === 0) score += 1; // openers usually state the topic
    if (sentence.length >= 40 && sentence.length <= 240) score += 1;
    return { sentence, index, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, max)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.sentence);
}
