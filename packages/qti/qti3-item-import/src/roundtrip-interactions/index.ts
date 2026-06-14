import { buildCorrectResponseIndex, extractItemScore } from '../_shared';

/**
 * Generic fallback hoist for every interaction the per-type transforms did not
 * already cover. Runs AFTER roundtripChoice / roundtripTextEntry /
 * roundtripExtendedText so its idempotent guards never overwrite their work.
 *
 * For every element whose tag name ends in `-interaction` and that carries a
 * `response-identifier`, this hoists:
 * - `correct-response`: the comma-joined qti-correct-response values of the
 *   matching qti-response-declaration (skipped when no values are declared).
 * - `score`: the item-level score read from qti-response-processing
 *   (defaulting to 1), applied only when correct-response was recoverable.
 *
 * Idempotent: existing correct-response / score attributes are preserved.
 *
 * Recovery limitations from standard QTI 3.0:
 * - `case-sensitive` and `area-mappings` are NOT reconstructed here. They are
 *   editor authoring hints with no lossless standard-QTI source, so a
 *   third-party item that never carried them imports without them.
 */
export const roundtripInteractions = (xmlDoc: XMLDocument): void => {
  const correctResponses = buildCorrectResponseIndex(xmlDoc);
  if (correctResponses.size === 0) return;

  const interactions = Array.from(xmlDoc.querySelectorAll('[response-identifier]')).filter(
    (el) =>
      el.tagName.toLowerCase().endsWith('-interaction') &&
      // qti-match-interaction and qti-order-interaction have their own explicit
      // transforms (roundtripMatch / roundtripOrder) that emit the editor's JSON
      // array format. The generic comma-joined hoist here would corrupt them, so
      // skip them.
      el.tagName.toLowerCase() !== 'qti-match-interaction' &&
      el.tagName.toLowerCase() !== 'qti-order-interaction'
  );

  for (const interaction of interactions) {
    const responseIdentifier = interaction.getAttribute('response-identifier');
    if (!responseIdentifier) continue;

    const correctResponse = correctResponses.get(responseIdentifier);
    if (correctResponse === undefined) continue;

    if (!interaction.getAttribute('correct-response')) {
      interaction.setAttribute('correct-response', correctResponse);
    }
    if (!interaction.getAttribute('score')) {
      interaction.setAttribute('score', String(extractItemScore(xmlDoc)));
    }
  }
};
