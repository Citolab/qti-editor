import { extractItemScore } from '../_shared';

/**
 * Hoist correct-response and score onto a single qti-associate-interaction.
 *
 * Standard QTI 3.0 declares associate correctness as a `pair` response:
 *
 *   <qti-response-declaration ... base-type="pair">
 *     <qti-correct-response>
 *       <qti-value>A P</qti-value>
 *       <qti-value>C M</qti-value>
 *       ...
 *     </qti-correct-response>
 *   </qti-response-declaration>
 *
 * Each <qti-value> is a space-separated identifier pair (order is not
 * significant — `pair` is undirected). The editor's qti-associate-interaction
 * stores its correct-response as a comma-separated list of space-separated
 * pairs ("A P, C M, D L"), the format the shared correct-response codec
 * uses across the editor (same convention as qti-order-interaction). This
 * transform converts the qti-value list into that string.
 *
 * Conditions (all must hold; otherwise no-op):
 * - Exactly ONE qti-associate-interaction in the item.
 * - The interaction's response-identifier maps to a qti-correct-response with
 *   at least one parseable identifier-pair qti-value.
 * - A score is extractable (defaulting to 1).
 *
 * Idempotent: existing correct-response/score attributes are preserved.
 */
export const roundtripAssociate = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-associate-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const responseIdentifier = interaction.getAttribute('response-identifier');
  if (!responseIdentifier) return;

  const pairs = readPairs(xmlDoc, responseIdentifier);
  if (pairs.length === 0) return;

  const score = extractItemScore(xmlDoc);

  if (!interaction.getAttribute('correct-response')) {
    interaction.setAttribute('correct-response', pairs.join(','));
  }
  if (!interaction.getAttribute('score')) {
    interaction.setAttribute('score', String(score));
  }
};

/**
 * Read the qti-correct-response identifier-pair values for a given response
 * identifier and return them as `"first second"` strings. Values that do not
 * contain two non-empty identifiers are skipped.
 */
function readPairs(xmlDoc: XMLDocument, responseIdentifier: string): string[] {
  const declaration = Array.from(xmlDoc.querySelectorAll('qti-response-declaration')).find(
    (decl) => decl.getAttribute('identifier') === responseIdentifier,
  );
  if (!declaration) return [];

  const pairs: string[] = [];
  declaration.querySelectorAll('qti-correct-response > qti-value').forEach((value) => {
    const text = value.textContent?.trim();
    if (!text) return;
    const [first, second] = text.split(/\s+/);
    if (first && second) {
      pairs.push(`${first} ${second}`);
    }
  });
  return pairs;
}
