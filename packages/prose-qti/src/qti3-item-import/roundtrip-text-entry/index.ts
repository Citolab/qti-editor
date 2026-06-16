import { buildCorrectResponseIndex, extractItemScore } from '../_shared';

/**
 * Hoist correct-response and score onto a single qti-text-entry-interaction.
 *
 * Conditions (all must hold; otherwise no-op):
 * - Exactly ONE qti-text-entry-interaction in the item.
 * - The interaction's response-identifier maps to a qti-correct-response with
 *   at least one qti-value.
 * - A score is extractable (defaulting to 1).
 *
 * Idempotent: existing correct-response/score attributes are preserved.
 */
export const roundtripTextEntry = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-text-entry-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const responseIdentifier = interaction.getAttribute('response-identifier');
  if (!responseIdentifier) return;

  const correctResponses = buildCorrectResponseIndex(xmlDoc);
  const correctResponse = correctResponses.get(responseIdentifier);
  if (correctResponse === undefined) return;

  const score = extractItemScore(xmlDoc);

  if (!interaction.getAttribute('correct-response')) {
    interaction.setAttribute('correct-response', correctResponse);
  }
  if (!interaction.getAttribute('score')) {
    interaction.setAttribute('score', String(score));
  }
};
