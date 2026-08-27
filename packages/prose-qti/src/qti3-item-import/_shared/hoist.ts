/**
 * Hoisting scoring state onto an interaction, in one place.
 *
 * Every per-type transform used to hand-roll this, and each one guarded the
 * whole block behind "did we find a `qti-correct-response`?" — so a declaration
 * whose scoring lives ONLY in a mapping had its mapping dropped, because the
 * transform returned before it got that far. ITEM003's text entry accepts
 * "breking" as well as "refractie", with the synonym present only in the
 * mapping; a candidate answering it scored 1 before a round trip and 0 after.
 *
 * So the answer key and the scoring model are hoisted independently here. Each
 * attribute is written only when absent, which keeps the transforms idempotent
 * and lets a per-type transform that knows better win.
 */

import {
  serializeMappingAttribute,
} from '@citolab/prose-qti/components/shared/composer/response-processing.js';

import { analyzeResponseProcessing, readStringMapping } from './response-processing.js';
import { buildScoreIndex, extractItemScore } from './score.js';

export interface HoistScoringOptions {
  /**
   * The answer key in the editor's comma-separated form, as the calling
   * transform computed it for this interaction's shape. `undefined` or `null`
   * means the transform found none — which is no longer a reason to skip the
   * rest.
   */
  correctResponse?: string | null;
}

/**
 * Write `correct-response`, `score`, `response-processing` and
 * `response-mapping` onto one interaction.
 */
export function hoistScoringAttributes(
  xmlDoc: XMLDocument,
  interaction: Element,
  options: HoistScoringOptions = {},
): void {
  const responseIdentifier = interaction.getAttribute('response-identifier');
  if (!responseIdentifier) return;

  if (options.correctResponse != null && !interaction.getAttribute('correct-response')) {
    interaction.setAttribute('correct-response', options.correctResponse);
  }

  if (!interaction.getAttribute('score')) {
    // Per-identifier first: an item with several interactions carries one rule
    // each, so the item-level fallback would hand this one a sibling's weight.
    const score = buildScoreIndex(xmlDoc).get(responseIdentifier) ?? extractItemScore(xmlDoc);
    interaction.setAttribute('score', String(score));
  }

  const kind = analyzeResponseProcessing(xmlDoc).kindByIdentifier.get(responseIdentifier);
  if (kind && !interaction.getAttribute('response-processing')) {
    interaction.setAttribute('response-processing', kind);
  }

  if (!interaction.getAttribute('response-mapping')) {
    const declaration = declarationFor(xmlDoc, responseIdentifier);
    const mapping = declaration ? readStringMapping(declaration) : null;
    if (mapping) {
      interaction.setAttribute('response-mapping', serializeMappingAttribute(mapping));
    }
  }
}

function declarationFor(xmlDoc: XMLDocument, responseIdentifier: string): Element | null {
  return (
    Array.from(xmlDoc.querySelectorAll('qti-response-declaration')).find(
      declaration => declaration.getAttribute('identifier') === responseIdentifier,
    ) ?? null
  );
}
