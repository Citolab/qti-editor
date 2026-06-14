import { extractItemScore } from '../_shared';

/**
 * Hoist correct-response and score onto a single qti-order-interaction.
 *
 * Standard QTI 3.0 declares order correctness as an `ordered` identifier
 * response:
 *
 *   <qti-response-declaration ... base-type="identifier" cardinality="ordered">
 *     <qti-correct-response>
 *       <qti-value>step_hypothese</qti-value>
 *       <qti-value>step_data</qti-value>
 *       <qti-value>step_conclusies</qti-value>
 *     </qti-correct-response>
 *   </qti-response-declaration>
 *
 * Each <qti-value> is one choice identifier, and document order encodes the
 * correct sequence. The editor's qti-order-interaction stores its
 * correct-response the same way qti-components does: a comma-separated list of
 * choice identifiers in order (`step_hypothese,step_data,…`), which is what its
 * parseDOM / compose path round-trips. This transform converts the qti-value
 * list into that string.
 *
 * Conditions (all must hold; otherwise no-op):
 * - Exactly ONE qti-order-interaction in the item.
 * - The interaction's response-identifier maps to a qti-correct-response with
 *   at least one qti-value.
 *
 * Idempotent: existing correct-response/score attributes are preserved.
 */
export const roundtripOrder = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-order-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const responseIdentifier = interaction.getAttribute('response-identifier');
  if (!responseIdentifier) return;

  const order = readOrderedValues(xmlDoc, responseIdentifier);
  if (order.length === 0) return;

  const score = extractItemScore(xmlDoc);

  if (!interaction.getAttribute('correct-response')) {
    interaction.setAttribute('correct-response', order.join(','));
  }
  if (!interaction.getAttribute('score')) {
    interaction.setAttribute('score', String(score));
  }
};

/**
 * Read the qti-correct-response choice identifiers for a given
 * response-identifier and return them in document order (the correct
 * sequence). Empty values are skipped.
 */
function readOrderedValues(xmlDoc: XMLDocument, responseIdentifier: string): string[] {
  const declaration = Array.from(xmlDoc.querySelectorAll('qti-response-declaration')).find(
    (decl) => decl.getAttribute('identifier') === responseIdentifier,
  );
  if (!declaration) return [];

  const order: string[] = [];
  declaration.querySelectorAll('qti-correct-response > qti-value').forEach((value) => {
    const text = value.textContent?.trim();
    if (text) order.push(text);
  });
  return order;
}
