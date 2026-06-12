import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem002 } from './qti-choice-interaction-item002.regression.stories';
import assertedXML from '../../../../public/qti/kennisnet/ITEM002-editor.xml?raw';

test('exported QTI matches the imported ITEM002-editor.xml', () => {
  // Pure pipeline — no rendering needed: import ITEM002 → export → compare.
  const exported = exportAssessmentItemDoc(importItem002());
  const expected = new DOMParser().parseFromString(assertedXML, 'application/xml');

  expect(exported).toEqualXmlDoc(expected);
});
