import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem003 } from './qti-text-entry-interaction-item003.regression.stories';
import assertedXML from '../../../../public/qti/kennisnet/ITEM003-editor.xml?raw';

test('exported QTI matches the imported ITEM003-editor.xml', () => {
  // Pure pipeline — no rendering needed: import ITEM003 → export → compare.
  const exported = exportAssessmentItemDoc(importItem003());
  const expected = new DOMParser().parseFromString(assertedXML, 'application/xml');

  expect(exported).toEqualXmlDoc(expected);
});
