import { qtiTransformItem } from '@qti-components/transformers';

import { roundtripChoice } from './roundtrip-choice';
import { roundtripExtendedText } from './roundtrip-extended-text';
import { roundtripTextEntry } from './roundtrip-text-entry';

/**
 * Run all three v1 transforms on a QTI 3.0 item XML string and return the
 * resulting XML string. Pure convenience — equivalent to
 *   qtiTransformItem().parse(xml)
 *     .fn(roundtripChoice).fn(roundtripTextEntry).fn(roundtripExtendedText).xml().
 */
export function roundtripQtiItem(xmlString: string): string {
  return qtiTransformItem()
    .parse(xmlString)
    .fn(roundtripChoice)
    .fn(roundtripTextEntry)
    .fn(roundtripExtendedText)
    .xml();
}
