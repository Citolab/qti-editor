import { extractItemScore } from '../_shared';

/**
 * Hoist correct-response and score onto a single qti-match-interaction.
 *
 * Standard QTI 3.0 declares match correctness as a `directedPair` response:
 *
 *   <qti-response-declaration ... base-type="directedPair">
 *     <qti-correct-response>
 *       <qti-value>SOURCE TARGET</qti-value>
 *       ...
 *     </qti-correct-response>
 *   </qti-response-declaration>
 *
 * Each <qti-value> is a space-separated `source target` pair. The editor's
 * qti-match-interaction stores its correct-response the same way qti-components
 * does: a JSON array of space-separated `source target` strings
 * (`["SOURCE TARGET", ...]`), which is what its parseDOM / compose path
 * round-trips. This transform converts the qti-value list into that array.
 *
 * Conditions (all must hold; otherwise no-op):
 * - Exactly ONE qti-match-interaction in the item.
 * - The interaction's response-identifier maps to a qti-correct-response with
 *   at least one parseable `source target` qti-value.
 * - A score is extractable (defaulting to 1).
 *
 * Idempotent: existing correct-response/score attributes are preserved.
 */
export const roundtripMatch = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-match-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const responseIdentifier = interaction.getAttribute('response-identifier');
  if (!responseIdentifier) return;

  const pairs = readDirectedPairs(xmlDoc, responseIdentifier);
  if (pairs.length === 0) return;

  const score = extractItemScore(xmlDoc);

  if (!interaction.getAttribute('correct-response')) {
    interaction.setAttribute('correct-response', JSON.stringify(pairs));
  }
  if (!interaction.getAttribute('score')) {
    interaction.setAttribute('score', String(score));
  }
};

/**
 * Read the qti-correct-response directed pairs for a given response-identifier
 * and return them as `"source target"` strings (qti-components' representation).
 * Values that do not contain a `source target` pair are skipped.
 */
function readDirectedPairs(xmlDoc: XMLDocument, responseIdentifier: string): string[] {
  const declaration = Array.from(xmlDoc.querySelectorAll('qti-response-declaration')).find(
    (decl) => decl.getAttribute('identifier') === responseIdentifier,
  );
  if (!declaration) return [];

  const pairs: string[] = [];
  declaration.querySelectorAll('qti-correct-response > qti-value').forEach((value) => {
    const text = value.textContent?.trim();
    if (!text) return;
    const [source, target] = text.split(/\s+/);
    if (source && target) {
      pairs.push(`${source} ${target}`);
    }
  });
  return pairs;
}
