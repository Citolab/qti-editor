import { parseQtiInteger } from '../qti-attributes.js';

import type { ComposerWarning } from './types.js';

/** The range a kept constraint has to stay in, given what the author has edited. */
export interface KeptConstraintBounds {
  min?: number;
  max?: number;
  /** `0` means "no limit" for this attribute (`max-choices`, `max-associations`): leave it alone. */
  zeroIsUnlimited?: boolean;
}

/** What the warning says, besides the values. */
export interface KeptConstraintContext {
  tagName: string;
  responseIdentifier?: string | null;
  /** Why the value is out of range, as a clause: "asks for more choices than can be selected". */
  reason: string;
}

/**
 * Moves a kept integer constraint back into range when the author's edits have pushed it out, and
 * reports it as a `CONSTRAINT_RECONCILED` warning. An attribute the author cannot see must not make
 * the authored correct response unreachable — see "QTI attributes kept as authored" in
 * `docs/roundtrip-format.md`.
 *
 * Works on the element the composer is building. An absent or unreadable attribute is left alone,
 * as is one already in range. Returns the value the element now carries, or `null` when it has none.
 */
export function reconcileKeptConstraint(
  element: Element,
  attribute: string,
  bounds: KeptConstraintBounds,
  context: KeptConstraintContext,
  warnings: ComposerWarning[],
): number | null {
  const value = parseQtiInteger(element.getAttribute(attribute));
  if (value == null || (bounds.zeroIsUnlimited && value === 0)) return value;

  let next = value;
  if (bounds.max != null && next > bounds.max) next = bounds.max;
  if (bounds.min != null && next < bounds.min) next = bounds.min;
  if (next === value) return value;

  element.setAttribute(attribute, String(next));
  warnings.push({
    code: 'CONSTRAINT_RECONCILED',
    message: `${attribute}="${value}" on ${context.tagName} ${context.reason}; it is exported as ${attribute}="${next}".`,
    tagName: context.tagName,
    ...(context.responseIdentifier ? { responseIdentifier: context.responseIdentifier } : {}),
  });
  return next;
}
