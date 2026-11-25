import { reconcileKeptConstraint } from './kept-constraints.js';

import type { ResponseValue } from '../response/codec.js';
import type { ComposerWarning } from './types.js';

/**
 * Keeps an imported `max-associations` / `min-associations` consistent with the correct response
 * the author has since edited. Neither is editable, and the runtime refuses a drop once
 * `max-associations` is reached, so a correct response with more pairs than that would be
 * unreachable; one with fewer pairs than `min-associations` would be reported invalid. `0` is "no
 * limit" for `max-associations`. An absent attribute stays absent.
 */
export function reconcileAssociationLimits(
  element: Element,
  correctResponse: ResponseValue,
  context: { tagName: string; responseIdentifier?: string | null },
  warnings: ComposerWarning[],
): void {
  const pairCount = Array.isArray(correctResponse) ? correctResponse.length : correctResponse ? 1 : 0;

  const maxAssociations = reconcileKeptConstraint(
    element,
    'max-associations',
    { min: pairCount, zeroIsUnlimited: true },
    { ...context, reason: 'allows fewer associations than the correct response makes' },
    warnings,
  );

  const upperBounds = [maxAssociations || Infinity, pairCount || Infinity];
  const upperBound = Math.min(...upperBounds);
  if (Number.isFinite(upperBound)) {
    reconcileKeptConstraint(
      element,
      'min-associations',
      { max: upperBound },
      { ...context, reason: 'asks for more associations than the correct response makes' },
      warnings,
    );
  }
}
