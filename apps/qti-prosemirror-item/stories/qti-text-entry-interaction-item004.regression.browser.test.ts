import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem004 } from './qti-text-entry-interaction-item004.regression.stories';
import assertedXML from '../assets/qti/kennisnet/ITEM004-editor.xml?raw';

test('exported QTI matches the imported ITEM004-editor.xml', () => {
  // Pure pipeline — no rendering needed: import ITEM004 → export → compare.
  const exported = exportAssessmentItemDoc(importItem004());
  const expected = new DOMParser().parseFromString(assertedXML, 'application/xml');

  expect(exported).toEqualXmlDoc(expected);
});
