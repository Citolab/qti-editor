import { qtiTransformItem } from '@qti-components/transformers';

import { roundtripChoice } from './roundtrip-choice';
import { roundtripExtendedText } from './roundtrip-extended-text';
import { roundtripInteractions } from './roundtrip-interactions';
import { roundtripItemBody } from './roundtrip-item-body';
import { roundtripMatch } from './roundtrip-match';
import { roundtripGapMatch } from './roundtrip-gap-match';
import { roundtripOrder } from './roundtrip-order';
import { roundtripSelectPoint } from './roundtrip-select-point';
import { roundtripTextEntry } from './roundtrip-text-entry';
import { reduceToItemBody } from './reduce-to-item-body';

/**
 * Run the roundtrip transforms on a QTI 3.0 item XML string and return the
 * resulting XML string. The per-type transforms run first (they carry
 * type-specific behaviour such as the extended-text rubric source), then a
 * generic fallback hoists correct-response / score onto any remaining
 * interaction. All transforms are idempotent, so order only affects which
 * source wins for an attribute, never correctness.
 */
export function roundtripQtiItem(xmlString: string): string {
  return qtiTransformItem()
    .parse(xmlString)
    .fn(roundtripChoice)
    .fn(roundtripTextEntry)
    .fn(roundtripExtendedText)
    .fn(roundtripMatch)
    .fn(roundtripGapMatch)
    .fn(roundtripOrder)
    .fn(roundtripSelectPoint)
    .fn(roundtripInteractions)
    .fn(roundtripItemBody)
    .fn(reduceToItemBody)
    .xml();
}
