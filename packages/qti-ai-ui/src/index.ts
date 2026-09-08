export { QtiAiSuggestions } from './qti-ai-suggestions/qti-ai-suggestions.js';
export { QtiAiClarification } from './qti-ai-clarification/qti-ai-clarification.js';
export { QtiAiProposal } from './qti-ai-proposal/qti-ai-proposal.js';
import { QtiAiSuggestions } from './qti-ai-suggestions/qti-ai-suggestions.js';
import { QtiAiClarification } from './qti-ai-clarification/qti-ai-clarification.js';
import { QtiAiProposal } from './qti-ai-proposal/qti-ai-proposal.js';
/** Explicit registration keeps imports side-effect free and permits host-selected tag prefixes. */
export function registerQtiAiElements(registry: CustomElementRegistry = customElements) {
  for (const [name, element] of [
    ['qti-ai-suggestions', QtiAiSuggestions],
    ['qti-ai-clarification', QtiAiClarification],
    ['qti-ai-proposal', QtiAiProposal]
  ] as const) {
    if (!registry.get(name)) registry.define(name, element);
  }
}
