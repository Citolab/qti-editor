import { extractItemScore } from '../_shared';

/**
 * Hoist correct-response and score onto a single qti-gap-match-interaction.
 *
 * Standard QTI 3.0 declares gap-match correctness as a `directedPair` response:
 *
 *   <qti-response-declaration ... base-type="directedPair">
 *     <qti-correct-response>
 *       <qti-value>GAPTEXT GAP</qti-value>
 *       ...
 *     </qti-correct-response>
 *   </qti-response-declaration>
 *
 * Each <qti-value> is a space-separated `gapText gap` directed pair. The editor's
 * qti-gap-match-interaction stores its correct-response as a comma-joined list
 * of `gapText gap` pairs ("GAPTEXT GAP,GAPTEXT GAP,…") — the canonical shared
 * codec format also used by associate, match, and order. `qti-components`
 * reads the response declaration directly as `string | string[]`, so each
 * entry round-trips identically to the JSON-array shape used previously.
 *
 * Conditions (all must hold; otherwise no-op):
 * - Exactly ONE qti-gap-match-interaction in the item.
 * - The interaction's response-identifier maps to a qti-correct-response with
 *   at least one parseable `gapText gap` qti-value.
 * - A score is extractable (defaulting to 1).
 *
 * Idempotent: existing correct-response/score attributes are preserved.
 */
export const roundtripGapMatch = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-gap-match-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const responseIdentifier = interaction.getAttribute('response-identifier');
  if (!responseIdentifier) return;

  const pairs = readDirectedPairs(xmlDoc, responseIdentifier);
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
 * Read the qti-correct-response directed pairs for a given response-identifier
 * and return them as `"gapText gap"` strings (qti-components' representation).
 * Values that do not contain a `gapText gap` pair are skipped.
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
    const [gapText, gap] = text.split(/\s+/);
    if (gapText && gap) {
      pairs.push(`${gapText} ${gap}`);
    }
  });
  return pairs;
}
