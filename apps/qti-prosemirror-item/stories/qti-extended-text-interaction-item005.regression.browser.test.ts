import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem005 } from './qti-extended-text-interaction-item005.regression.stories';
import assertedXML from '../assets/qti/kennisnet/ITEM005-editor.xml?raw';

test('exported QTI matches the imported ITEM005-editor.xml', () => {
  // Pure pipeline — no rendering needed: import ITEM005 → export → compare.
  const exported = exportAssessmentItemDoc(importItem005());
  const expected = new DOMParser().parseFromString(assertedXML, 'application/xml');

  expect(exported).toEqualXmlDoc(expected);
});
